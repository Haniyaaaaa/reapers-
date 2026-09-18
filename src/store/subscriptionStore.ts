import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';
import * as subscriptionsApi from '../services/supabase/subscriptions';
import * as safepayApi from '../services/supabase/safepay';
import { captureException } from '../services/analytics/analytics';
import type { SubscriptionPlanRow, UserSubscriptionRow } from '../services/supabase/types';

const SAFEPAY_RETURN_URL = 'reapers://safepay-return';

function isActive(sub: UserSubscriptionRow | null): boolean {
  if (!sub || sub.status !== 'active') return false;
  if (!sub.expires_at) return true;
  return new Date(sub.expires_at).getTime() > Date.now();
}

type SubscriptionState = {
  plans: SubscriptionPlanRow[];
  mySubscription: UserSubscriptionRow | null;
  loading: boolean;
  checkingOut: boolean;
  verifying: boolean;
  error: string | null;
  isPro: () => boolean;
  fetchPlans: () => Promise<void>;
  fetchMySubscription: (userId: string) => Promise<void>;
  // Creates a Safepay checkout session and opens it in an in-app browser, awaiting the
  // redirect back. Returns the orderId to verify on success, or null if the user cancelled
  // (or dismissed the browser) before completing anything — nothing to verify in that case.
  startCheckout: (planId: string) => Promise<string | null>;
  // Authoritative check of what actually happened with a given order — call this before
  // trusting that a checkout session "succeeded" just because the browser returned.
  verifyPayment: (orderId: string, userId: string) => Promise<'active' | 'failed' | 'pending'>;
  cancelSubscription: (id: string) => Promise<void>;
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plans: [],
  mySubscription: null,
  loading: false,
  checkingOut: false,
  verifying: false,
  error: null,

  isPro: () => isActive(get().mySubscription),

  fetchPlans: async () => {
    set({ loading: true });
    try {
      const plans = await subscriptionsApi.listActivePlans();
      set({ plans, loading: false });
    } catch (err) {
      captureException(err);
      set({ loading: false });
    }
  },

  fetchMySubscription: async (userId) => {
    try {
      const mySubscription = await subscriptionsApi.getMySubscription(userId);
      set({ mySubscription });
    } catch (err) {
      captureException(err);
    }
  },

  // Opens Safepay's hosted checkout page in an in-app browser (same WebBrowser.openAuthSessionAsync
  // pattern signInWithOAuthProvider already uses for Google/Apple login) and awaits the redirect
  // back. The orderId is already known from createCheckout's response, so unlike an OAuth
  // callback there's nothing to parse off the returned URL — only whether the session completed.
  startCheckout: async (planId) => {
    set({ checkingOut: true, error: null });
    try {
      const { orderId, checkoutUrl } = await safepayApi.createCheckout(planId);
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, SAFEPAY_RETURN_URL);
      set({ checkingOut: false });
      if (result.type !== 'success') {
        // Cancelled/dismissed — no charge was necessarily even attempted, or it was abandoned
        // mid-flow. Nothing to verify; if the user did complete payment anyway, the webhook
        // still activates the subscription server-side and they'll see it next time they check.
        return null;
      }
      return orderId;
    } catch (err) {
      captureException(err);
      set({ checkingOut: false, error: err instanceof Error ? err.message : 'Could not start checkout' });
      return null;
    }
  },

  // Authoritative check of what actually happened with the order (re-derived server-side from
  // Safepay's own status endpoint, never assumed from the browser having "succeeded").
  verifyPayment: async (orderId, userId) => {
    set({ verifying: true, error: null });
    try {
      const { status } = await safepayApi.verifyPayment(orderId);
      set({ verifying: false });
      if (status === 'active') {
        // The Edge Function already wrote the new active row — refetch to pick it up rather
        // than guessing its shape client-side.
        await get().fetchMySubscription(userId);
      } else if (status === 'failed') {
        set({ error: 'Payment failed' });
      }
      return status;
    } catch (err) {
      captureException(err);
      set({ verifying: false, error: err instanceof Error ? err.message : 'Could not verify payment' });
      return 'failed';
    }
  },

  cancelSubscription: async (id) => {
    try {
      await subscriptionsApi.cancelSubscription(id);
      set((s) => ({
        mySubscription: s.mySubscription && s.mySubscription.id === id ? { ...s.mySubscription, status: 'cancelled' } : s.mySubscription,
        error: null,
      }));
    } catch (err) {
      captureException(err);
      set({ error: err instanceof Error ? err.message : 'Could not cancel subscription' });
    }
  },
}));
