import { supabase } from './client';
import type { EventInsert, EventPaymentApplicationRow, EventPayoutAccountRow, EventRow, EventRsvpRow, EventUpdate } from './types';
import type { EventPaymentApplication, GameEvent, PayoutAccount, RsvpStatus, TicketPlan } from '../../types/event';
import { PAGE_SIZE, toPage, type Page } from './pagination';
import { likePattern } from './searchText';

type EventRowWithHost = EventRow & { profiles: { display_name: string; avatar_uri?: string | null; avatar_id?: string | null } | null };

function eventRowToEvent(row: EventRowWithHost, myRsvp: EventRsvpRow | null): GameEvent {
  return {
    id: row.id,
    hostId: row.host_id,
    title: row.title,
    description: row.description,
    type: row.type,
    category: (row.category as GameEvent['category']) ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    location: row.location,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    cover: row.cover_url ?? 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=1200',
    posterName: row.profiles?.display_name ?? 'Someone',
    posterAvatarUri: row.profiles?.avatar_uri ?? undefined,
    posterAvatarId: row.profiles?.avatar_id ?? undefined,
    attendeeCount: row.attendee_count,
    maxAttendees: row.max_attendees ?? undefined,
    registrationClosesBeforeMin: row.registration_closes_before_minutes ?? 0,
    rsvp: (myRsvp?.status as RsvpStatus) ?? null,
    paid: row.paid,
    price: row.price ?? undefined,
    currency: row.currency ?? undefined,
    paidByUser: myRsvp?.paid_by_user ?? false,
    payoutContactNote: row.payout_contact_note ?? undefined,
  };
}

// events now has two FK paths to profiles (direct host_id, and an indirect one via
// event_rsvps' own two FKs) — PostgREST can't infer which without disambiguation, the same
// PGRST201 class of bug fixed for `experts` earlier in this project (EXPERT_SELECT in
// experts.ts uses the identical `!constraint_name` pattern).
const EVENT_SELECT = '*, profiles!events_host_id_fkey(display_name, avatar_uri, avatar_id)';

export async function listEvents(userId: string, offset = 0, limit = PAGE_SIZE): Promise<Page<GameEvent>> {
  const [{ data: rows, error }, { data: myRsvps }] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1),
    supabase.from('event_rsvps').select('*').eq('user_id', userId),
  ]);
  if (error) throw error;
  const rsvpByEvent = new Map((myRsvps ?? []).map((r) => [r.event_id, r]));
  const page = toPage(rows as unknown as EventRowWithHost[] | null, limit);
  return { rows: page.rows.map((r) => eventRowToEvent(r, rsvpByEvent.get(r.id) ?? null)), hasMore: page.hasMore };
}

/** Server-side search over title, description, location and category — upcoming events only (the
 * same 3h grace window the screens use), soonest first. */
export async function searchEvents(userId: string, query: string, limit = 40): Promise<GameEvent[]> {
  const p = likePattern(query);
  if (!p) return [];
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const [{ data: rows, error }, { data: myRsvps }] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .or(`title.ilike.${p},description.ilike.${p},location.ilike.${p},category.ilike.${p}`)
      .gte('starts_at', cutoff)
      .order('starts_at', { ascending: true })
      .limit(limit),
    supabase.from('event_rsvps').select('*').eq('user_id', userId),
  ]);
  if (error) throw error;
  const rsvpByEvent = new Map((myRsvps ?? []).map((r) => [r.event_id, r]));
  return ((rows ?? []) as unknown as EventRowWithHost[]).map((r) => eventRowToEvent(r, rsvpByEvent.get(r.id) ?? null));
}

/** Events you host or are RSVP'd 'going' to — powers "My Events" on the profile screen.
 * Unlike listEvents (paginated, everyone's upcoming events), this is scoped to one user and
 * expected to stay small, so it's fetched in one page rather than needing its own cursor. */
export async function listMyEvents(userId: string): Promise<GameEvent[]> {
  const { data: myRsvps, error: rsvpErr } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'going');
  if (rsvpErr) throw rsvpErr;
  const rsvpByEvent = new Map((myRsvps ?? []).map((r) => [r.event_id, r]));
  const goingIds = Array.from(rsvpByEvent.keys());

  const orClause = goingIds.length > 0 ? `host_id.eq.${userId},id.in.(${goingIds.join(',')})` : `host_id.eq.${userId}`;
  const { data: rows, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .or(orClause)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return ((rows ?? []) as unknown as EventRowWithHost[]).map((r) => eventRowToEvent(r, rsvpByEvent.get(r.id) ?? null));
}

export async function createEvent(input: EventInsert): Promise<GameEvent> {
  const { data, error } = await supabase.from('events').insert(input).select(EVENT_SELECT).single();
  if (error) throw error;
  return eventRowToEvent(data as unknown as EventRowWithHost, null);
}

/** Returns just the raw updated row — the store merges the editable fields into its
 * existing GameEvent rather than replacing it wholesale, since this query has no access to
 * the caller's RSVP status (that lives in a separate table, and a plain update doesn't need
 * to re-fetch it). */
export async function updateEvent(id: string, patch: EventUpdate): Promise<EventRow> {
  const { data, error } = await supabase.from('events').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/** The exact venue (or join link) — RLS on event_venues (0067) only returns the row to the host,
 * admins, and people with a confirmed "going" RSVP, so a null result means "not revealed yet"
 * (or none was set), not an error. */
export async function getEventVenue(eventId: string): Promise<string | null> {
  const { data, error } = await supabase.from('event_venues').select('venue').eq('event_id', eventId).maybeSingle();
  if (error) throw error;
  return data?.venue ?? null;
}

export async function setEventVenue(eventId: string, venue: string | null): Promise<void> {
  if (!venue) {
    const { error } = await supabase.from('event_venues').delete().eq('event_id', eventId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('event_venues').upsert({ event_id: eventId, venue }, { onConflict: 'event_id' });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export type EventAttendee = { userId: string; name: string; avatarUri?: string; avatarId?: string; ticketCount: number };

/** RLS (event_rsvps_select_own_or_host) only actually returns rows to the host/admin or the
 * caller's own row — a non-host caller gets an empty list back, not an error. Callers should
 * only render this for the event's host. */
export async function listEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('user_id, ticket_count, profiles(display_name, avatar_uri, avatar_id)')
    .eq('event_id', eventId)
    .eq('status', 'going')
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data as unknown as { user_id: string; ticket_count: number | null; profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null }[]).map(
    (row) => ({
      userId: row.user_id,
      ticketCount: row.ticket_count ?? 1,
      name: row.profiles?.display_name ?? 'Someone',
      avatarUri: row.profiles?.avatar_uri ?? undefined,
      avatarId: row.profiles?.avatar_id ?? undefined,
    }),
  );
}

export async function setRsvp(eventId: string, userId: string, status: RsvpStatus, paidByUser = false): Promise<void> {
  if (status === null) {
    const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('event_rsvps')
    .upsert({ event_id: eventId, user_id: userId, status, paid_by_user: paidByUser }, { onConflict: 'event_id,user_id' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Paid events: host-published bank accounts + attendee proof-of-payment
// applications — supabase/migrations/0024_event_payment_applications.sql.
// Reapers never touches the money; this is a proof-collection + review workflow only.
// ---------------------------------------------------------------------------

function payoutAccountRowToAccount(row: EventPayoutAccountRow): PayoutAccount {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountTitle: row.account_title,
    accountNumber: row.account_number,
    iban: row.iban ?? undefined,
  };
}

export async function createPayoutAccounts(
  eventId: string,
  accounts: { bankName: string; accountTitle: string; accountNumber: string; iban?: string }[],
): Promise<void> {
  const { error } = await supabase.from('event_payout_accounts').insert(
    accounts.map((a) => ({ event_id: eventId, bank_name: a.bankName, account_title: a.accountTitle, account_number: a.accountNumber, iban: a.iban })),
  );
  if (error) throw error;
}

export async function addPayoutAccount(
  eventId: string,
  account: { bankName: string; accountTitle: string; accountNumber: string; iban?: string },
): Promise<PayoutAccount> {
  const { data, error } = await supabase
    .from('event_payout_accounts')
    .insert({ event_id: eventId, bank_name: account.bankName, account_title: account.accountTitle, account_number: account.accountNumber, iban: account.iban })
    .select()
    .single();
  if (error) throw error;
  return payoutAccountRowToAccount(data);
}

export async function deletePayoutAccount(id: string): Promise<void> {
  const { error } = await supabase.from('event_payout_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function listPayoutAccounts(eventId: string): Promise<PayoutAccount[]> {
  const { data, error } = await supabase.from('event_payout_accounts').select('*').eq('event_id', eventId).order('created_at');
  if (error) throw error;
  return (data ?? []).map(payoutAccountRowToAccount);
}

type ApplicationRowWithApplicant = EventPaymentApplicationRow & {
  profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null;
  events?: { title: string } | null;
};

function applicationRowToApplication(row: ApplicationRowWithApplicant): EventPaymentApplication {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? undefined,
    applicantId: row.applicant_id,
    applicantName: row.profiles?.display_name ?? 'Someone',
    applicantAvatarUri: row.profiles?.avatar_uri ?? undefined,
    applicantAvatarId: row.profiles?.avatar_id ?? undefined,
    payoutAccountId: row.payout_account_id ?? undefined,
    proofScreenshotPath: row.proof_screenshot_path,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    reservationCode: row.reservation_code ?? undefined,
    planName: row.plan_name ?? undefined,
    unitPrice: row.unit_price ?? undefined,
    quantity: row.quantity ?? 1,
    totalAmount: row.total_amount ?? undefined,
    createdAt: row.created_at,
  };
}

const APPLICATION_SELECT = '*, profiles(display_name, avatar_uri, avatar_id)';

export async function listTicketPlans(eventId: string): Promise<TicketPlan[]> {
  const { data, error } = await supabase.from('event_ticket_plans').select('*').eq('event_id', eventId).order('sort_order').order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
}

export async function createTicketPlans(eventId: string, plans: { name: string; price: number }[]): Promise<void> {
  if (plans.length === 0) return;
  const { error } = await supabase
    .from('event_ticket_plans')
    .insert(plans.map((p, i) => ({ event_id: eventId, name: p.name, price: p.price, sort_order: i })));
  if (error) throw error;
}

export async function submitPaymentApplication(input: {
  eventId: string;
  applicantId: string;
  payoutAccountId?: string;
  proofScreenshotPath: string;
  ticketPlanId?: string;
  quantity?: number;
}): Promise<EventPaymentApplication> {
  const { data, error } = await supabase
    .from('event_payment_applications')
    .insert({
      event_id: input.eventId,
      applicant_id: input.applicantId,
      payout_account_id: input.payoutAccountId,
      proof_screenshot_path: input.proofScreenshotPath,
      ticket_plan_id: input.ticketPlanId,
      quantity: input.quantity ?? 1,
    })
    .select(APPLICATION_SELECT)
    .single();
  if (error) throw error;
  return applicationRowToApplication(data as unknown as ApplicationRowWithApplicant);
}

export async function resubmitPaymentApplication(
  id: string,
  patch: { payoutAccountId?: string; proofScreenshotPath: string; ticketPlanId?: string; quantity?: number },
): Promise<EventPaymentApplication> {
  const { data, error } = await supabase
    .from('event_payment_applications')
    .update({
      payout_account_id: patch.payoutAccountId,
      proof_screenshot_path: patch.proofScreenshotPath,
      ticket_plan_id: patch.ticketPlanId,
      quantity: patch.quantity,
      status: 'pending',
    })
    .eq('id', id)
    .select(APPLICATION_SELECT)
    .single();
  if (error) throw error;
  return applicationRowToApplication(data as unknown as ApplicationRowWithApplicant);
}

export async function getMyApplication(eventId: string, userId: string): Promise<EventPaymentApplication | null> {
  const { data, error } = await supabase
    .from('event_payment_applications')
    .select(APPLICATION_SELECT)
    .eq('event_id', eventId)
    .eq('applicant_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? applicationRowToApplication(data as unknown as ApplicationRowWithApplicant) : null;
}

export async function listApplicationsForEvent(eventId: string, offset = 0, limit = PAGE_SIZE): Promise<Page<EventPaymentApplication>> {
  const { data, error } = await supabase
    .from('event_payment_applications')
    .select(APPLICATION_SELECT)
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data as unknown as ApplicationRowWithApplicant[] | null, limit);
  return { rows: page.rows.map(applicationRowToApplication), hasMore: page.hasMore };
}

/** Pending payment applications across EVERY event this user hosts, not just one — the
 * aggregated "Payment applications" view reachable from the profile screen. RLS
 * (event_payment_applications_select) already lets a host see applications on their own
 * events; `events!inner(...)` filters that down to events they specifically host. */
export async function listMyHostApplications(hostId: string, offset = 0, limit = PAGE_SIZE): Promise<Page<EventPaymentApplication>> {
  const { data, error } = await supabase
    .from('event_payment_applications')
    .select('*, profiles(display_name, avatar_uri, avatar_id), events!inner(title, host_id)')
    .eq('events.host_id', hostId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data as unknown as ApplicationRowWithApplicant[] | null, limit);
  return { rows: page.rows.map(applicationRowToApplication), hasMore: page.hasMore };
}

export async function respondApplication(id: string, approve: boolean, rejectionReason?: string): Promise<void> {
  const { error } = await supabase
    .from('event_payment_applications')
    .update({ status: approve ? 'approved' : 'rejected', rejection_reason: approve ? undefined : rejectionReason })
    .eq('id', id);
  if (error) throw error;
}
