import { supabase } from './client';
import type {
  ExpertRow,
  PaymentOrderRow,
  ProfileRow,
  ProfileUpdate,
  SubscriptionPlanInsert,
  SubscriptionPlanRow,
  SubscriptionPlanUpdate,
  SupportTicketRow,
} from './types';
import type { Role } from '../../types/user';
import { PAGE_SIZE, toPage, type Page } from './pagination';

export { PAGE_SIZE };
export type { Page };

export type DashboardSummary = {
  totalUsers: number;
  activeSubscriptions: number;
  roleBreakdown: { role: Role; count: number }[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Role counts come from the admin_role_breakdown() RPC (0037_admin_role_breakdown_rpc.sql),
  // which aggregates in Postgres — this used to pull every profile row's `roles` array over
  // the wire just to count them client-side, a full-table scan/transfer at real scale.
  const [{ count: totalUsers }, { count: activeSubscriptions }, { data: roleRows, error: roleErr }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.rpc('admin_role_breakdown'),
  ]);
  if (roleErr) throw roleErr;
  const counts: Record<string, number> = { gamer: 0, developer: 0, expert: 0 };
  for (const row of roleRows ?? []) counts[row.role] = row.count;
  return {
    totalUsers: totalUsers ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    roleBreakdown: (['gamer', 'developer', 'expert'] as Role[]).map((role) => ({ role, count: counts[role] ?? 0 })),
  };
}

export async function listPendingByRole(role: 'gamer' | 'developer', offset = 0, limit = PAGE_SIZE): Promise<Page<ProfileRow>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('approval_status', 'pending')
    .contains('roles', [role])
    .order('created_at')
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return toPage(data, limit);
}

export async function approveAccount(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ approval_status: 'approved' }).eq('id', userId);
  if (error) throw error;
}

export async function rejectAccount(userId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ approval_status: 'rejected', approval_rejection_reason: reason }).eq('id', userId);
  if (error) throw error;
}

/** Edits any user's own-content profile fields — gated purely by the `profiles_update_by_admin`
 * RLS policy (0012_onboarding_addendum.sql), already admin-only. `is_admin`/`is_expert`/
 * `credibility`/follower counts stay untouchable even here — enforce_profile_immutable_columns
 * still strips those for anyone but service_role, admin included. */
export async function adminUpdateProfile(userId: string, patch: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function listPendingExperts(offset = 0, limit = PAGE_SIZE): Promise<Page<ExpertRow>> {
  const { data, error } = await supabase
    .from('experts')
    .select('*')
    .eq('verified', false)
    .order('applied_at')
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return toPage(data, limit);
}

export async function listVerifiedExpertsAdmin(offset = 0, limit = PAGE_SIZE): Promise<Page<ExpertRow>> {
  const { data, error } = await supabase
    .from('experts')
    .select('*')
    .eq('verified', true)
    .order('verified_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return toPage(data, limit);
}

export async function approveExpert(id: string): Promise<void> {
  const { error } = await supabase.from('experts').update({ verified: true, verified_at: new Date().toISOString(), rejection_reason: null }).eq('id', id);
  if (error) throw error;
}

export async function rejectExpert(id: string, reason: string): Promise<void> {
  const { error } = await supabase.from('experts').update({ verified: false, rejection_reason: reason }).eq('id', id);
  if (error) throw error;
}

export type ManualExpertInput = {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  company?: string;
  bio: string;
  specialties?: string[];
  portfolioUrl?: string;
  linkedinUrl?: string;
};

export async function manualOnboardExpert(input: ManualExpertInput): Promise<{ email: string; temporaryPassword: string }> {
  const { data, error } = await supabase.functions.invoke('admin-create-expert', { body: input });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listPlans(): Promise<SubscriptionPlanRow[]> {
  const { data, error } = await supabase.from('subscription_plans').select('*').order('price');
  if (error) throw error;
  return data ?? [];
}

export async function createPlan(input: SubscriptionPlanInsert): Promise<SubscriptionPlanRow> {
  const { data, error } = await supabase.from('subscription_plans').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id: string, patch: SubscriptionPlanUpdate): Promise<SubscriptionPlanRow> {
  const { data, error } = await supabase.from('subscription_plans').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function listTickets(status?: SupportTicketRow['status'], offset = 0, limit = PAGE_SIZE): Promise<Page<SupportTicketRow>> {
  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return toPage(data, limit);
}

// ---------------------------------------------------------------------------
// User directory + detail (Phase 21)
// ---------------------------------------------------------------------------

export type UserFilters = {
  search?: string;
  role?: Role;
  approvalStatus?: ProfileRow['approval_status'];
};

function applyUserFilters<T>(query: T, filters: UserFilters): T {
  let q = query as any;
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  }
  if (filters.role) q = q.contains('roles', [filters.role]);
  if (filters.approvalStatus) q = q.eq('approval_status', filters.approvalStatus);
  return q;
}

export async function listAllUsers(filters: UserFilters, offset = 0, limit = PAGE_SIZE): Promise<Page<ProfileRow>> {
  const query = applyUserFilters(
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1),
    filters,
  );
  const { data, error } = await query;
  if (error) throw error;
  return toPage(data, limit);
}

/** Real total for the current filter set — a `head: true` count query, not a row fetch, so
 * paging through thousands of users can show "Showing X of N" instead of an unbounded list
 * with no sense of scale. */
export async function countAllUsers(filters: UserFilters): Promise<number> {
  const query = applyUserFilters(supabase.from('profiles').select('id', { count: 'exact', head: true }), filters);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Admin-only — reads auth.users via a security-definer RPC (supabase/migrations/
 * 0014_admin_directory.sql) since email deliberately never lives on the publicly-readable
 * profiles row. Called one user at a time from AdminUserDetailScreen, never in a bulk list. */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_get_user_email', { target_id: userId });
  if (error) throw error;
  return data;
}

export type UserSubscriptionWithPlan = {
  id: string;
  status: 'active' | 'cancelled' | 'expired';
  renews_at: string | null;
  expires_at: string | null;
  plan: { id: string; name: string; price: number; billing_interval: string } | null;
};

export type UserDetail = {
  profile: ProfileRow;
  email: string | null;
  expert: ExpertRow | null;
  subscription: UserSubscriptionWithPlan | null;
  ticketCount: number;
};

export async function getUserDetail(userId: string): Promise<UserDetail> {
  const [profileRes, expertRes, subRes, emailRes, ticketCountRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('experts').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('user_subscriptions')
      .select('id, status, renews_at, expires_at, plan:subscription_plans(id, name, price, billing_interval)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getUserEmail(userId),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (expertRes.error) throw expertRes.error;
  if (subRes.error) throw subRes.error;

  return {
    profile: profileRes.data,
    email: emailRes,
    expert: expertRes.data,
    subscription: (subRes.data as unknown as UserSubscriptionWithPlan | null) ?? null,
    ticketCount: ticketCountRes.count ?? 0,
  };
}

export type SubscriberRow = {
  id: string;
  status: 'active' | 'cancelled' | 'expired';
  renews_at: string | null;
  expires_at: string | null;
  user: { id: string; display_name: string; username: string } | null;
  plan: { id: string; name: string; price: number; billing_interval: string } | null;
};

export async function listAllSubscriptions(offset = 0, limit = PAGE_SIZE): Promise<Page<SubscriberRow>> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('id, status, renews_at, expires_at, user:profiles(id, display_name, username), plan:subscription_plans(id, name, price, billing_interval)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return toPage(data as unknown as SubscriberRow[], limit);
}

export async function adminCancelSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('user_subscriptions').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

/** Comps a plan onto a user for testing/support — bypasses the Safepay checkout flow
 * entirely. Always inserts a fresh row (user_subscriptions has no uniqueness constraint on
 * user_id, matching the "one row per checkout attempt" shape used elsewhere), so a user with
 * an existing cancelled/expired row just gets a new active one alongside it. */
export async function adminGrantSubscription(userId: string, planId: string, days: number): Promise<UserSubscriptionWithPlan> {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({ user_id: userId, plan_id: planId, status: 'active', expires_at: expiresAt })
    .select('id, status, renews_at, expires_at, plan:subscription_plans(id, name, price, billing_interval)')
    .single();
  if (error) throw error;
  return data as unknown as UserSubscriptionWithPlan;
}

export type PaymentOrderSummary = Pick<
  PaymentOrderRow,
  'id' | 'amount' | 'currency' | 'status' | 'refunded_amount' | 'provider' | 'created_at'
>;

export async function listPaymentOrdersForUser(userId: string): Promise<PaymentOrderSummary[]> {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('id, amount, currency, status, refunded_amount, provider, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Admin-only — goes through the safepay-refund Edge Function rather than a plain client
 * update, since issuing a real refund needs SAFEPAY_SECRET_KEY, which must never be
 * client-accessible. Omit `amount` to refund the full remaining balance. */
export async function adminRefundOrder(orderId: string, amount: number | undefined, reason: string): Promise<{ status: string; refundedAmount: number }> {
  const { data, error } = await supabase.functions.invoke('safepay-refund', { body: { orderId, amount, reason } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Extends from the later of "now" and the current expiry, so extending an already-expired
 * or about-to-expire subscription doesn't shortchange the user, and re-activates it if it had
 * lapsed to 'expired'. */
export async function adminExtendSubscription(id: string, days: number): Promise<{ expires_at: string }> {
  const { data: current, error: fetchErr } = await supabase.from('user_subscriptions').select('expires_at').eq('id', id).single();
  if (fetchErr) throw fetchErr;
  const base = current.expires_at && new Date(current.expires_at).getTime() > Date.now() ? new Date(current.expires_at) : new Date();
  const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('user_subscriptions').update({ expires_at: expiresAt, status: 'active' }).eq('id', id);
  if (error) throw error;
  return { expires_at: expiresAt };
}
