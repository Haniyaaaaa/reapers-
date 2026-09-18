import { create } from 'zustand';
import * as adminApi from '../services/supabase/admin';
import * as supportApi from '../services/supabase/support';
import { captureException } from '../services/analytics/analytics';
import { playSound } from '../services/sound';
import type { DashboardSummary, ManualExpertInput, PaymentOrderSummary, SubscriberRow, UserDetail, UserFilters } from '../services/supabase/admin';
import type { ExpertRow, ProfileRow, ProfileUpdate, SubscriptionPlanInsert, SubscriptionPlanRow, SubscriptionPlanUpdate, SupportTicketRow } from '../services/supabase/types';

type AdminState = {
  summary: DashboardSummary | null;

  pendingGamers: ProfileRow[];
  pendingGamersHasMore: boolean;
  pendingDevelopers: ProfileRow[];
  pendingDevelopersHasMore: boolean;
  pendingExperts: ExpertRow[];
  pendingExpertsHasMore: boolean;
  verifiedExperts: ExpertRow[];
  verifiedExpertsHasMore: boolean;

  users: ProfileRow[];
  usersHasMore: boolean;
  usersTotalCount: number;
  userFilters: UserFilters;
  userDetail: Record<string, UserDetail>;

  plans: SubscriptionPlanRow[];
  subscriptions: SubscriberRow[];
  subscriptionsHasMore: boolean;
  paymentOrders: Record<string, PaymentOrderSummary[]>;

  tickets: SupportTicketRow[];
  ticketsHasMore: boolean;
  ticketStatusFilter: SupportTicketRow['status'] | undefined;

  loading: boolean;
  error: string | null;

  fetchSummary: () => Promise<void>;

  fetchPendingGamers: () => Promise<void>;
  loadMorePendingGamers: () => Promise<void>;
  fetchPendingDevelopers: () => Promise<void>;
  loadMorePendingDevelopers: () => Promise<void>;
  fetchPendingExperts: () => Promise<void>;
  loadMorePendingExperts: () => Promise<void>;
  fetchVerifiedExperts: () => Promise<void>;
  loadMoreVerifiedExperts: () => Promise<void>;

  approveAccount: (userId: string) => Promise<void>;
  rejectAccount: (userId: string, reason: string) => Promise<void>;
  adminUpdateProfile: (userId: string, patch: ProfileUpdate) => Promise<void>;
  approveExpert: (id: string) => Promise<void>;
  rejectExpert: (id: string, reason: string) => Promise<void>;
  manualOnboardExpert: (input: ManualExpertInput) => Promise<{ email: string; temporaryPassword: string }>;

  setUserFilters: (filters: UserFilters) => void;
  fetchUsers: () => Promise<void>;
  loadMoreUsers: () => Promise<void>;
  fetchUserDetail: (userId: string) => Promise<void>;

  fetchPlans: () => Promise<void>;
  createPlan: (input: SubscriptionPlanInsert) => Promise<void>;
  updatePlan: (id: string, patch: SubscriptionPlanUpdate) => Promise<void>;

  fetchSubscriptions: () => Promise<void>;
  loadMoreSubscriptions: () => Promise<void>;
  cancelUserSubscription: (id: string) => Promise<void>;
  grantSubscription: (userId: string, planId: string, days: number) => Promise<void>;
  extendSubscription: (id: string, days: number, userId?: string) => Promise<void>;

  fetchPaymentOrders: (userId: string) => Promise<void>;
  refundOrder: (orderId: string, amount: number | undefined, reason: string, userId: string) => Promise<{ status: string; refundedAmount: number }>;

  fetchTickets: (status?: SupportTicketRow['status']) => Promise<void>;
  loadMoreTickets: () => Promise<void>;
  setTicketStatus: (id: string, status: SupportTicketRow['status']) => Promise<void>;
};

/** Every action below catches and reports to Sentry rather than throwing — this is an
 * internal admin console whose screens (PendingApprovalList, AdminUserDetailScreen, etc.)
 * fire these from bare `await` handlers with no local try/catch of their own; letting a
 * failure throw would leave a button's busy/disabled state stuck forever and produce an
 * unhandled promise rejection. `error` is set for the one screen (AdminOverviewScreen)
 * that surfaces it; every other screen degrades to "nothing changed, try again." */
async function guarded<T>(set: (partial: Partial<AdminState>) => void, message: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const result = await fn();
    set({ error: null });
    return result;
  } catch (err) {
    captureException(err);
    set({ error: err instanceof Error ? err.message : message });
    return undefined;
  }
}

export const useAdminStore = create<AdminState>((set, get) => ({
  summary: null,

  pendingGamers: [],
  pendingGamersHasMore: false,
  pendingDevelopers: [],
  pendingDevelopersHasMore: false,
  pendingExperts: [],
  pendingExpertsHasMore: false,
  verifiedExperts: [],
  verifiedExpertsHasMore: false,

  users: [],
  usersHasMore: false,
  usersTotalCount: 0,
  userFilters: {},
  userDetail: {},

  plans: [],
  subscriptions: [],
  subscriptionsHasMore: false,
  paymentOrders: {},

  tickets: [],
  ticketsHasMore: false,
  ticketStatusFilter: undefined,

  loading: false,
  error: null,

  fetchSummary: async () => {
    set({ loading: true });
    const summary = await guarded(set, 'Could not load dashboard summary', () => adminApi.getDashboardSummary());
    set({ summary: summary ?? get().summary, loading: false });
  },

  fetchPendingGamers: async () => {
    const page = await guarded(set, 'Could not load pending gamers', () => adminApi.listPendingByRole('gamer', 0));
    if (page) set({ pendingGamers: page.rows, pendingGamersHasMore: page.hasMore });
  },
  loadMorePendingGamers: async () => {
    const { pendingGamers } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listPendingByRole('gamer', pendingGamers.length));
    if (page) set({ pendingGamers: [...pendingGamers, ...page.rows], pendingGamersHasMore: page.hasMore });
  },

  fetchPendingDevelopers: async () => {
    const page = await guarded(set, 'Could not load pending developers', () => adminApi.listPendingByRole('developer', 0));
    if (page) set({ pendingDevelopers: page.rows, pendingDevelopersHasMore: page.hasMore });
  },
  loadMorePendingDevelopers: async () => {
    const { pendingDevelopers } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listPendingByRole('developer', pendingDevelopers.length));
    if (page) set({ pendingDevelopers: [...pendingDevelopers, ...page.rows], pendingDevelopersHasMore: page.hasMore });
  },

  fetchPendingExperts: async () => {
    const page = await guarded(set, 'Could not load pending experts', () => adminApi.listPendingExperts(0));
    if (page) set({ pendingExperts: page.rows, pendingExpertsHasMore: page.hasMore });
  },
  loadMorePendingExperts: async () => {
    const { pendingExperts } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listPendingExperts(pendingExperts.length));
    if (page) set({ pendingExperts: [...pendingExperts, ...page.rows], pendingExpertsHasMore: page.hasMore });
  },

  fetchVerifiedExperts: async () => {
    const page = await guarded(set, 'Could not load verified experts', () => adminApi.listVerifiedExpertsAdmin(0));
    if (page) set({ verifiedExperts: page.rows, verifiedExpertsHasMore: page.hasMore });
  },
  loadMoreVerifiedExperts: async () => {
    const { verifiedExperts } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listVerifiedExpertsAdmin(verifiedExperts.length));
    if (page) set({ verifiedExperts: [...verifiedExperts, ...page.rows], verifiedExpertsHasMore: page.hasMore });
  },

  approveAccount: async (userId) => {
    const ok = await guarded(set, 'Could not approve account', () => adminApi.approveAccount(userId));
    if (ok === undefined) return;
    playSound('approve');
    set((s) => ({
      pendingGamers: s.pendingGamers.filter((p) => p.id !== userId),
      pendingDevelopers: s.pendingDevelopers.filter((p) => p.id !== userId),
      users: s.users.map((p) => (p.id === userId ? { ...p, approval_status: 'approved' } : p)),
      userDetail: s.userDetail[userId]
        ? { ...s.userDetail, [userId]: { ...s.userDetail[userId], profile: { ...s.userDetail[userId].profile, approval_status: 'approved' } } }
        : s.userDetail,
    }));
  },

  rejectAccount: async (userId, reason) => {
    const ok = await guarded(set, 'Could not reject account', () => adminApi.rejectAccount(userId, reason));
    if (ok === undefined) return;
    set((s) => ({
      pendingGamers: s.pendingGamers.filter((p) => p.id !== userId),
      pendingDevelopers: s.pendingDevelopers.filter((p) => p.id !== userId),
      users: s.users.map((p) => (p.id === userId ? { ...p, approval_status: 'rejected', approval_rejection_reason: reason } : p)),
      userDetail: s.userDetail[userId]
        ? {
            ...s.userDetail,
            [userId]: {
              ...s.userDetail[userId],
              profile: { ...s.userDetail[userId].profile, approval_status: 'rejected', approval_rejection_reason: reason },
            },
          }
        : s.userDetail,
    }));
  },

  adminUpdateProfile: async (userId, patch) => {
    const updated = await guarded(set, 'Could not update profile', () => adminApi.adminUpdateProfile(userId, patch));
    if (!updated) return;
    set((s) => ({
      users: s.users.map((p) => (p.id === userId ? updated : p)),
      userDetail: s.userDetail[userId] ? { ...s.userDetail, [userId]: { ...s.userDetail[userId], profile: updated } } : s.userDetail,
    }));
  },

  approveExpert: async (id) => {
    const ok = await guarded(set, 'Could not approve expert', () => adminApi.approveExpert(id));
    if (ok === undefined) return;
    set((s) => ({
      pendingExperts: s.pendingExperts.filter((e) => e.id !== id),
      userDetail: s.userDetail[id]
        ? { ...s.userDetail, [id]: { ...s.userDetail[id], expert: s.userDetail[id].expert ? { ...s.userDetail[id].expert!, verified: true } : null } }
        : s.userDetail,
    }));
  },

  rejectExpert: async (id, reason) => {
    const ok = await guarded(set, 'Could not reject expert', () => adminApi.rejectExpert(id, reason));
    if (ok === undefined) return;
    set((s) => ({
      pendingExperts: s.pendingExperts.filter((e) => e.id !== id),
      userDetail: s.userDetail[id]
        ? {
            ...s.userDetail,
            [id]: {
              ...s.userDetail[id],
              expert: s.userDetail[id].expert ? { ...s.userDetail[id].expert!, verified: false, rejection_reason: reason } : null,
            },
          }
        : s.userDetail,
    }));
  },

  // Deliberately still throws — AdminExpertsScreen has its own try/catch specifically to
  // show the generated credentials error (or the credentials themselves) inline.
  manualOnboardExpert: async (input) => adminApi.manualOnboardExpert(input),

  setUserFilters: (filters) => set({ userFilters: filters }),

  fetchUsers: async () => {
    const filters = get().userFilters;
    const page = await guarded(set, 'Could not load users', () => adminApi.listAllUsers(filters, 0));
    if (page) set({ users: page.rows, usersHasMore: page.hasMore });
    adminApi.countAllUsers(filters).then((usersTotalCount) => set({ usersTotalCount })).catch(() => undefined);
  },
  loadMoreUsers: async () => {
    const { users, userFilters } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listAllUsers(userFilters, users.length));
    if (page) set({ users: [...users, ...page.rows], usersHasMore: page.hasMore });
  },

  fetchUserDetail: async (userId) => {
    const detail = await guarded(set, 'Could not load user', () => adminApi.getUserDetail(userId));
    if (detail) set((s) => ({ userDetail: { ...s.userDetail, [userId]: detail } }));
  },

  fetchPlans: async () => {
    const plans = await guarded(set, 'Could not load plans', () => adminApi.listPlans());
    if (plans) set({ plans });
  },

  // Deliberately still throws — AdminSubscriptionsScreen's own try/catch shows the specific
  // validation/save error inline next to the "New plan" form.
  createPlan: async (input) => {
    const plan = await adminApi.createPlan(input);
    set((s) => ({ plans: [...s.plans, plan] }));
  },

  updatePlan: async (id, patch) => {
    const plan = await guarded(set, 'Could not update plan', () => adminApi.updatePlan(id, patch));
    if (plan) set((s) => ({ plans: s.plans.map((p) => (p.id === id ? plan : p)) }));
  },

  fetchSubscriptions: async () => {
    const page = await guarded(set, 'Could not load subscriptions', () => adminApi.listAllSubscriptions(0));
    if (page) set({ subscriptions: page.rows, subscriptionsHasMore: page.hasMore });
  },
  loadMoreSubscriptions: async () => {
    const { subscriptions } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listAllSubscriptions(subscriptions.length));
    if (page) set({ subscriptions: [...subscriptions, ...page.rows], subscriptionsHasMore: page.hasMore });
  },
  cancelUserSubscription: async (id) => {
    const ok = await guarded(set, 'Could not cancel subscription', () => adminApi.adminCancelSubscription(id));
    if (ok === undefined) return;
    set((s) => ({ subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, status: 'cancelled' } : sub)) }));
  },

  // Deliberately still throws — AdminUserDetailScreen's own try/catch shows the specific
  // grant error inline in its modal.
  grantSubscription: async (userId, planId, days) => {
    const sub = await adminApi.adminGrantSubscription(userId, planId, days);
    set((s) => ({
      userDetail: s.userDetail[userId] ? { ...s.userDetail, [userId]: { ...s.userDetail[userId], subscription: sub } } : s.userDetail,
    }));
  },

  // Deliberately still throws — both callers (AdminUserDetailScreen, AdminSubscriptionsScreen)
  // show the specific extend error inline in their own modal.
  extendSubscription: async (id, days, userId) => {
    const { expires_at } = await adminApi.adminExtendSubscription(id, days);
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, status: 'active', expires_at } : sub)),
      userDetail:
        userId && s.userDetail[userId]?.subscription
          ? { ...s.userDetail, [userId]: { ...s.userDetail[userId], subscription: { ...s.userDetail[userId].subscription!, status: 'active', expires_at } } }
          : s.userDetail,
    }));
  },

  fetchPaymentOrders: async (userId) => {
    const orders = await guarded(set, 'Could not load payment orders', () => adminApi.listPaymentOrdersForUser(userId));
    if (orders) set((s) => ({ paymentOrders: { ...s.paymentOrders, [userId]: orders } }));
  },

  // Deliberately still throws — this is real money, the refund modal has its own try/catch to
  // show the specific Safepay error inline rather than a swallowed generic toast.
  refundOrder: async (orderId, amount, reason, userId) => {
    const result = await adminApi.adminRefundOrder(orderId, amount, reason);
    set((s) => ({
      paymentOrders: {
        ...s.paymentOrders,
        [userId]: (s.paymentOrders[userId] ?? []).map((o) =>
          o.id === orderId ? { ...o, status: result.status as PaymentOrderSummary['status'], refunded_amount: result.refundedAmount } : o,
        ),
      },
    }));
    return result;
  },

  fetchTickets: async (status) => {
    const page = await guarded(set, 'Could not load tickets', () => adminApi.listTickets(status, 0));
    if (page) set({ tickets: page.rows, ticketsHasMore: page.hasMore, ticketStatusFilter: status });
  },
  loadMoreTickets: async () => {
    const { tickets, ticketStatusFilter } = get();
    const page = await guarded(set, 'Could not load more', () => adminApi.listTickets(ticketStatusFilter, tickets.length));
    if (page) set({ tickets: [...tickets, ...page.rows], ticketsHasMore: page.hasMore });
  },
  setTicketStatus: async (id, status) => {
    const ok = await guarded(set, 'Could not update ticket status', () => supportApi.updateTicketStatus(id, status));
    if (ok === undefined) return;
    set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status } : t)) }));
  },
}));
