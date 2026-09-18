import { supabase } from './client';
import type { SubscriptionPlanRow, UserSubscriptionRow } from './types';

/** Real billing, via Safepay's hosted-checkout gateway — see ./safepay.ts for the
 * create-checkout/verify-payment calls (safepay-create-checkout / safepay-verify-payment Edge
 * Functions). Reverses the "intent-only" pattern used everywhere else in this app. */
export async function listActivePlans(): Promise<SubscriptionPlanRow[]> {
  const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('price');
  if (error) throw error;
  return data ?? [];
}

export async function getMySubscription(userId: string): Promise<UserSubscriptionRow | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cancelSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('user_subscriptions').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}
