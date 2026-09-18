// Race-condition-safe subscription activation, shared by safepay-verify-payment (fired when
// the app's browser session returns) and safepay-webhook (fired server-to-server by Safepay,
// often around the same moment) — both can race to finalize the same order, unlike PayFast's
// flow which only ever had one caller. Activation logic itself (cancel-prior-active,
// compute expiresAt from billing_interval, insert the new row) is carried over unchanged from
// the old payfast-confirm-payment.
//
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_DURATION_DAYS = 30;

export type ActivationResult = 'activated' | 'already_handled' | 'order_not_found';

export async function activateSubscriptionForOrder(adminClient: SupabaseClient<any, any, any>, orderId: string): Promise<ActivationResult> {
  // Atomic conditional claim: this UPDATE ... WHERE status = 'pending' is a single statement
  // at the Postgres row-lock level, not a separate read-then-write — whichever caller's
  // request reaches the database first wins the claim, and the loser gets zero rows back with
  // no race window in between. This is what makes concurrent client-verify + webhook calls safe.
  const { data: claimed, error: claimError } = await adminClient
    .from('payment_orders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claimed) {
    // Either another caller already claimed it (already_handled) or the order doesn't exist
    // at all — distinguish the two so callers can 404 appropriately in the latter case.
    const { data: existing } = await adminClient.from('payment_orders').select('id').eq('id', orderId).maybeSingle();
    return existing ? 'already_handled' : 'order_not_found';
  }

  const { data: plan } = await adminClient.from('subscription_plans').select('billing_interval').eq('id', claimed.plan_id).single();
  const days = plan?.billing_interval === 'yearly' ? 365 : plan?.billing_interval === 'monthly' ? 30 : DEFAULT_DURATION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Cancel any prior active row for this user before inserting the new one, so
  // getMySubscription's "most recent active row" lookup stays unambiguous.
  await adminClient.from('user_subscriptions').update({ status: 'expired' }).eq('user_id', claimed.user_id).eq('status', 'active');
  await adminClient.from('user_subscriptions').insert({
    user_id: claimed.user_id,
    plan_id: claimed.plan_id,
    status: 'active',
    expires_at: expiresAt,
    payment_order_id: claimed.id,
  });

  return 'activated';
}
