// Step 2 of Safepay's hosted-redirect flow (replaces payfast-confirm-payment) — called by the
// app right after WebBrowser.openAuthSessionAsync's browser session returns control, via
// supabase.functions.invoke('safepay-verify-payment', { body: { orderId } }), JWT-authenticated.
//
// This is NOT the sole source of truth: safepay-webhook (server-to-server, authoritative) can
// resolve the same order independently and around the same time. Both call the shared
// activateSubscriptionForOrder helper, whose atomic conditional UPDATE makes it safe for
// either one to "win" the race with no double-activation.
//
// Deliberate deviation from payfast-confirm-payment: a *transport* failure calling Safepay here
// does NOT mark the order failed — unlike PayFast's synchronous /transaction call, a network
// error talking to Safepay's status endpoint tells us nothing about the actual payment outcome,
// so the order is left pending for a later webhook or retry to resolve correctly instead.
//
// Requires Edge Function secrets: SAFEPAY_ENVIRONMENT, SAFEPAY_MERCHANT_API_KEY, SAFEPAY_SECRET_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getTrackerStatus, trackerStateToOrderStatus, redactSensitive } from '../_shared/safepay.ts';
import { activateSubscriptionForOrder } from '../_shared/subscriptionActivation.ts';

type VerifyBody = { orderId?: string };

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: getUserError,
  } = await callerClient.auth.getUser();
  if (getUserError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as VerifyBody;
  if (!body.orderId) {
    return new Response(JSON.stringify({ error: 'orderId is required' }), { status: 400 });
  }

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: order, error: orderError } = await adminClient
    .from('payment_orders')
    .select('*')
    .eq('provider_order_id', body.orderId)
    .eq('user_id', user.id)
    .single();
  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }

  // A terminal state already recorded (possibly by the webhook, which may well have landed
  // before this call) — report it as-is without calling Safepay again.
  if (order.status !== 'pending') {
    return new Response(JSON.stringify({ status: order.status === 'completed' ? 'active' : order.status }), { status: 200 });
  }

  if (!order.provider_transaction_id) {
    return new Response(JSON.stringify({ error: 'Order has no tracker yet' }), { status: 409 });
  }

  try {
    const trackerStatus = await getTrackerStatus(order.provider_transaction_id);
    const mapped = trackerStateToOrderStatus(trackerStatus.state);

    if (mapped === 'completed') {
      await adminClient
        .from('payment_orders')
        .update({
          payment_method: trackerStatus.cardType ? 'card' : order.payment_method,
          masked_account: trackerStatus.lastFour ? `**** ${trackerStatus.lastFour}` : order.masked_account,
          raw_response: redactSensitive(trackerStatus.raw),
        })
        .eq('id', order.id);
      // Regardless of whether this call wins the activation race or finds it already handled
      // by the webhook, the outcome from the client's point of view is the same: subscribed.
      await activateSubscriptionForOrder(adminClient, order.id);
      return new Response(JSON.stringify({ status: 'active' }), { status: 200 });
    }

    if (mapped === 'pending') {
      // The browser returned before Safepay's own backend finalized the tracker — a
      // legitimate transient state, not a failure. The client should treat this as "still
      // processing" and may retry shortly, or rely on the webhook to resolve it.
      return new Response(JSON.stringify({ status: 'pending' }), { status: 200 });
    }

    // A definitive non-success state (failed/refunded/etc reported this early would be
    // unusual, but handle it the same way): only write it if still pending, so this can't
    // clobber something more specific the webhook already recorded.
    await adminClient
      .from('payment_orders')
      .update({ status: mapped, raw_response: redactSensitive(trackerStatus.raw), updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending');
    return new Response(JSON.stringify({ status: 'failed', message: trackerStatus.state }), { status: 200 });
  } catch (err) {
    // Transport failure only — do not mark the order failed, see header comment.
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Safepay status check failed' }), {
      status: 502,
    });
  }
});
