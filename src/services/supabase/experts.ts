import { supabase } from './client';
import type { BookingRow, ExpertInsert, ExpertRow, ExpertUpdate } from './types';
import type { Expert, ExpertReview } from '../../types/expert';
import type { BookingSummary, ExpertSlot } from '../../types/extra';
import { dayKey, formatSlotTime, type WeeklyAvailability } from '../../utils/expertSlots';
import { PAGE_SIZE, toPage, type Page } from './pagination';
import { likePattern } from './searchText';
import { EXPERTISE_TAGS } from '../../types/expert';

const REVIEW_ALREADY_EXISTS = '23505';

type ExpertRowWithProfile = ExpertRow & {
  profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null;
};

const SESSION_MINUTES = 15;

function expertRowToExpert(row: ExpertRowWithProfile): Expert {
  return {
    id: row.id,
    name: row.profiles?.display_name ?? 'Expert',
    role: row.role,
    company: row.company,
    avatar: row.profiles?.avatar_uri ?? undefined,
    avatarId: row.profiles?.avatar_id ?? undefined,
    verified: row.verified,
    specialties: row.specialties,
    rating: row.rating,
    reviewCount: row.review_count,
    nextSlot: 'Check calendar',
    bio: row.bio,
    yearsExperience: row.years_experience ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    portfolioUrl: row.portfolio_url ?? undefined,
    work: row.work ?? undefined,
  };
}

// `experts` has two FKs to `profiles` (`id` — the expert's own profile, and `verified_by` —
// which admin approved them, added later), so PostgREST can't infer which one `profiles(...)`
// means without disambiguating via the constraint name.
const EXPERT_SELECT = '*, profiles!experts_id_fkey(display_name, avatar_uri, avatar_id)';

export async function listVerifiedExperts(offset = 0, limit = PAGE_SIZE, specialty?: string, excludeUserId?: string): Promise<Page<Expert>> {
  let query = supabase.from('experts').select(EXPERT_SELECT).eq('verified', true);
  if (specialty) query = query.contains('specialties', [specialty]);
  // An expert shouldn't see themselves in their own directory — nothing to book. Excluded
  // here (not just hidden in the UI) so it holds across pagination and specialty filters.
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { data, error } = await query.order('rating', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data as unknown as ExpertRowWithProfile[] | null, limit);
  return { rows: page.rows.map(expertRowToExpert), hasMore: page.hasMore };
}

/** Server-side search across an expert's name (from their profile), title, company, bio and
 * expertise tags, honouring the active specialty and self-exclusion. Best rated first. Two queries
 * merged, because the name lives on `profiles` and can't share one `or()` with the expert columns. */
export async function searchExperts(query: string, opts: { specialty?: string; excludeUserId?: string } = {}, limit = 30): Promise<Expert[]> {
  const p = likePattern(query);
  if (!p) return [];
  const needle = query.trim().toLowerCase();
  const tagMatches = EXPERTISE_TAGS.filter((t) => t.toLowerCase().includes(needle));
  const clauses = [`role.ilike.${p}`, `company.ilike.${p}`, `bio.ilike.${p}`];
  if (tagMatches.length) clauses.push(`specialties.ov.{${tagMatches.map((t) => `"${t}"`).join(',')}}`);

  const base = () => {
    let q = supabase.from('experts').select(EXPERT_SELECT).eq('verified', true);
    if (opts.specialty) q = q.contains('specialties', [opts.specialty]);
    if (opts.excludeUserId) q = q.neq('id', opts.excludeUserId);
    return q;
  };

  const [{ data: byFields, error }, { data: nameMatches }] = await Promise.all([
    base().or(clauses.join(',')).order('rating', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id').ilike('display_name', p).limit(50),
  ]);
  if (error) throw error;

  let byName: ExpertRowWithProfile[] = [];
  const ids = (nameMatches ?? []).map((r) => r.id);
  if (ids.length) {
    const { data } = await base().in('id', ids).order('rating', { ascending: false }).limit(limit);
    byName = (data ?? []) as unknown as ExpertRowWithProfile[];
  }

  const merged = new Map<string, ExpertRowWithProfile>();
  for (const row of [...((byFields ?? []) as unknown as ExpertRowWithProfile[]), ...byName]) merged.set(row.id, row);
  return Array.from(merged.values())
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map(expertRowToExpert);
}

/** Real `count(*)`, replacing the header's old `experts.length * 10 || 290` fabrication —
 * that read the number of rows currently loaded on-device, not a real total. */
export async function listExpertsCount(specialty?: string, excludeUserId?: string): Promise<number> {
  let query = supabase.from('experts').select('id', { count: 'exact', head: true }).eq('verified', true);
  if (specialty) query = query.contains('specialties', [specialty]);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Batch session-count for a page of experts — one query, reduced client-side, same
 * batch-not-N+1 convention used everywhere else in this codebase (chat's reaction grouping,
 * the posts feed's comment-count batching). Replaces the old hardcoded "212 SESSIONS". */
export async function listSessionCounts(expertIds: string[]): Promise<Map<string, number>> {
  if (expertIds.length === 0) return new Map();
  const { data, error } = await supabase.from('bookings').select('expert_id').in('expert_id', expertIds).neq('status', 'cancelled');
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.expert_id, (counts.get(row.expert_id) ?? 0) + 1);
  return counts;
}

/** Real skill-based matching via Postgres's array-overlap operator, ordered by rating as a
 * tiebreaker — replaces "Recommended For Your Project" being, in reality, just the rest of the
 * top-rated list with no relation to the viewer at all. Callers should treat an empty
 * `viewerSkills` (or a genuinely empty result) as "no real match" and fall back to
 * listVerifiedExperts, relabeling the section honestly rather than presenting this as
 * personalized when it isn't. */
export async function listRecommendedExperts(viewerSkills: string[], excludeUserId?: string, offset = 0, limit = PAGE_SIZE): Promise<Page<Expert>> {
  if (viewerSkills.length === 0) return { rows: [], hasMore: false };
  let query = supabase.from('experts').select(EXPERT_SELECT).eq('verified', true).overlaps('specialties', viewerSkills);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { data, error } = await query.order('rating', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data as unknown as ExpertRowWithProfile[] | null, limit);
  return { rows: page.rows.map(expertRowToExpert), hasMore: page.hasMore };
}

export async function getExpert(id: string): Promise<Expert | null> {
  const { data, error } = await supabase.from('experts').select(EXPERT_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? expertRowToExpert(data as unknown as ExpertRowWithProfile) : null;
}

export async function getMyApplication(userId: string): Promise<ExpertRow | null> {
  const { data, error } = await supabase.from('experts').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function applyAsExpert(input: ExpertInsert): Promise<ExpertRow> {
  const { data, error } = await supabase.from('experts').insert(input).select().single();
  if (error) throw error;
  return data;
}

/** Used by OnboardingScreen's Expert step, which can run more than once for the same user
 * (e.g. resubmitting after a rejected general-account application) — insert-or-update instead
 * of a plain insert so a second pass through onboarding doesn't hit a primary-key conflict.
 * verified/verified_at/verified_by are omitted, so the enforcement trigger's protection never
 * even comes into play here. */
export async function upsertExpertApplication(input: ExpertInsert): Promise<ExpertRow> {
  const { data, error } = await supabase.from('experts').upsert(input).select().single();
  if (error) throw error;
  return data;
}

/** verified/verified_at/verified_by are silently rejected by an enforcement trigger for
 * non-admins even if included here — this only ever sends the editable profile fields.
 * Always clears rejection_reason: this is the applicant's own edit-and-resubmit path (the
 * only other path back into 'pending' review after a rejection), and rejection_reason should
 * never linger once they've made a change — harmless no-op if it was already null. */
export async function updateExpertProfile(userId: string, patch: ExpertUpdate): Promise<ExpertRow> {
  const { data, error } = await supabase.from('experts').update({ ...patch, rejection_reason: null }).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;
}

/** The expert provides this per-booking, after the session exists — not a static profile-wide
 * link. bookings_update_participant (0006_experts.sql) already permits expert_id = auth.uid()
 * to write any column on their own booking rows, so no new RLS policy is needed. */
export async function setBookingMeetingLink(bookingId: string, meetingLink: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ meeting_link: meetingLink }).eq('id', bookingId);
  if (error) throw error;
}

/** Reads the expert's persisted weekday-pattern availability (expert_availability +
 * expert_time_slots) into the shape utils/expertSlots.ts's buildDaySlots expects. A weekday
 * with no rows means that weekday has no bookable slots at all. */
export async function getAvailability(expertId: string): Promise<WeeklyAvailability> {
  const { data, error } = await supabase
    .from('expert_time_slots')
    .select('weekday, starts_at, ends_at')
    .eq('expert_id', expertId)
    .order('weekday')
    .order('starts_at');
  if (error) throw error;
  const byWeekday = new Map<number, { start: string; end: string }[]>();
  for (const row of data ?? []) {
    const list = byWeekday.get(row.weekday) ?? [];
    list.push({ start: row.starts_at.slice(0, 5), end: row.ends_at.slice(0, 5) });
    byWeekday.set(row.weekday, list);
  }
  return Array.from(byWeekday.entries()).map(([weekday, slots]) => ({ weekday, slots }));
}

/** Owner-only replace-all: deletes every existing row for this expert and reinserts the
 * new pattern in one round trip — simplest correct approach for a low-frequency settings
 * action (no per-row diffing needed). */
export async function setAvailability(expertId: string, pattern: WeeklyAvailability): Promise<void> {
  const { error: delAvailErr } = await supabase.from('expert_availability').delete().eq('expert_id', expertId);
  if (delAvailErr) throw delAvailErr;
  const { error: delSlotsErr } = await supabase.from('expert_time_slots').delete().eq('expert_id', expertId);
  if (delSlotsErr) throw delSlotsErr;

  const activeWeekdays = pattern.filter((p) => p.slots.length > 0);
  if (activeWeekdays.length === 0) return;

  const { error: availErr } = await supabase
    .from('expert_availability')
    .insert(activeWeekdays.map((p) => ({ expert_id: expertId, weekday: p.weekday })));
  if (availErr) throw availErr;

  const slotRows = activeWeekdays.flatMap((p) =>
    p.slots.map((s) => ({ expert_id: expertId, weekday: p.weekday, starts_at: s.start, ends_at: s.end })),
  );
  const { error: slotsErr } = await supabase.from('expert_time_slots').insert(slotRows);
  if (slotsErr) throw slotsErr;
}

/** All confirmed bookings for this expert over the next `windowDays`, converted to the
 * {day,time,available:false}[] shape ExpertCalendar/buildDaySlots already knows how to
 * filter per viewed day — the calendar doesn't expose which day is selected to its parent,
 * so a bounded future window is fetched once up front rather than re-queried per day. */
export async function listBookedSlots(expertId: string, windowDays = 60): Promise<ExpertSlot[]> {
  const from = new Date();
  const to = new Date(from.getTime() + windowDays * 86400000);
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('expert_id', expertId)
    .eq('status', 'confirmed')
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString());
  if (error) throw error;
  return (data ?? []).map((row: BookingRow) => {
    const d = new Date(row.starts_at);
    return { day: dayKey(d), time: formatSlotTime(d.getHours(), d.getMinutes()), available: false };
  });
}

/** day: 'YYYY-MM-DD', time: 'h:mm AM/PM' (as produced by utils/expertSlots.ts) — parsed into
 * a real timestamptz here since that's what the DB's unique(expert_id, starts_at) constraint
 * needs to actually prevent a double-booking race. */
export async function bookSlot(expertId: string, requesterId: string, startsAt: Date): Promise<'ok' | 'conflict' | 'requires_pro'> {
  const endsAt = new Date(startsAt.getTime() + SESSION_MINUTES * 60 * 1000);
  const { error } = await supabase.from('bookings').insert({
    expert_id: expertId,
    requester_id: requesterId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  });
  if (error) {
    if (error.code === '23505') return 'conflict';
    // errcode raised by enforce_booking_allowed() (0020_configurable_plan_entitlements.sql) —
    // checking the actual Postgres error code instead of matching the trigger's message text,
    // which already changed once (0019 -> 0020) and silently broke a message-based check.
    if (error.code === '55007') return 'requires_pro';
    throw error;
  }
  return 'ok';
}

type BookingRowWithNames = BookingRow & {
  requester: { display_name: string } | null;
  expert: { profiles: { display_name: string } | null } | null;
};

/** Both directions in one query: sessions this user booked ("My sessions") and, if they're
 * an expert themselves, sessions others booked with them ("Sessions with you") — distinguished
 * by `role` on each row so MyBookingsScreen can section them without two round trips. */
export async function listMyBookings(userId: string): Promise<BookingSummary[]> {
  // profiles!bookings_requester_id_fkey disambiguates the same way EXPERT_SELECT's
  // profiles!experts_id_fkey already had to — expert_reviews' own (booking_id -> bookings,
  // reviewer_id -> profiles) FKs give PostgREST a second path between bookings and profiles
  // alongside this direct one.
  const { data, error } = await supabase
    .from('bookings')
    .select('*, requester:profiles!bookings_requester_id_fkey(display_name), expert:experts(profiles!experts_id_fkey(display_name))')
    .or(`requester_id.eq.${userId},expert_id.eq.${userId}`)
    .order('starts_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as BookingRowWithNames[]).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    status: row.status,
    expertId: row.expert_id,
    expertName: row.expert?.profiles?.display_name ?? 'Expert',
    expertMeetingLink: row.meeting_link ?? undefined,
    requesterId: row.requester_id,
    requesterName: row.requester?.display_name ?? 'Someone',
    role: row.requester_id === userId ? 'requester' : 'expert',
  }));
}

/** Which of the caller's own bookings already have a review — MyBookingsScreen uses this to
 * decide which past sessions still need a "Rate this session" prompt. */
export async function getMyReviewedBookingIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('expert_reviews').select('booking_id').eq('reviewer_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.booking_id));
}

/** RLS (expert_reviews_insert_own) is the real gate here — reviewer must be the booking's own
 * requester and the session must have already ended — this call surfaces those rejections with
 * a friendly message rather than a raw Postgres error, same style as demos' submitReview. */
export async function submitExpertReview(bookingId: string, expertId: string, reviewerId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase.from('expert_reviews').insert({ booking_id: bookingId, expert_id: expertId, reviewer_id: reviewerId, rating, comment });
  if (error) {
    if (error.code === REVIEW_ALREADY_EXISTS) throw new Error("You've already rated this session.");
    throw new Error('Could not submit review — the session may not have ended yet.');
  }
}

/** Newest first. Anyone can read these (expert_reviews_select_all); the reviewer's name and
 * avatar come from a second profiles lookup rather than a join, since expert_reviews has two
 * FK paths to profiles-adjacent tables and PostgREST would need the same disambiguation
 * listMyBookings does. */
export async function listExpertReviews(expertId: string, limit = 30): Promise<ExpertReview[]> {
  const { data, error } = await supabase
    .from('expert_reviews')
    .select('*')
    .eq('expert_id', expertId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_id)));
  const authors = new Map<string, { display_name: string; avatar_uri: string | null; avatar_id: string | null }>();
  if (reviewerIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_uri, avatar_id').in('id', reviewerIds);
    for (const p of profiles ?? []) authors.set(p.id, p);
  }
  return rows.map((r) => {
    const a = authors.get(r.reviewer_id);
    return {
      id: r.id,
      expertId: r.expert_id,
      reviewerId: r.reviewer_id,
      reviewerName: a?.display_name ?? 'Someone',
      reviewerAvatarUri: a?.avatar_uri ?? undefined,
      reviewerAvatarId: a?.avatar_id ?? undefined,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    };
  });
}
