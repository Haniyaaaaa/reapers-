// Admin-only refund action, called from AdminSubscriptionsScreen.tsx via
// supabase.functions.invoke('safepay-refund', { body: { orderId, amount?, reason } }).
// Needs to be an Edge Function (rather than a plain client Supabase call, like the rest of
// AdminSubscriptionsScreen's actions) because it's the first admin action that needs
// SAFEPAY_SECRET_KEY, which must never be client-accessible.
//
// No PayFast equivalent existed — refundTransaction() was written in _shared/payfast.ts but
// never wired to anything. This closes that gap.
//
// Requires Edge Function secrets: SAFEPAY_ENVIRONMENT, SAFEPAY_SECRET_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { refundTracker, redactSensitive } from '../_shared/safepay.ts';

type RefundBody = { orderId?: string; amount?: number; reason?: string };

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: getUserError,
  } = await callerClient.auth.getUser();
  if (getUserError || !caller) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 });
  }

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Same admin-check idiom as admin-create-expert/index.ts: the caller's own JWT only proves
  // who they are — whether they're allowed to do this is checked here, server-side, against
  // the service-role client, never trusted from anything the client claims about itself.
  const { data: callerProfile, error: callerProfileError } = await adminClient.from('profiles').select('is_admin').eq('id', caller.id).single();
  if (callerProfileError || !callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as RefundBody;
  if (!body.orderId || !body.reason?.trim()) {
    return new Response(JSON.stringify({ error: 'orderId and reason are required' }), { status: 400 });
  }

  const { data: order, error: orderError } = await adminClient.from('payment_orders').select('*').eq('id', body.orderId).single();
  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }
  if (order.status !== 'completed' && order.status !== 'partially_refunded') {
    return new Response(JSON.stringify({ error: `Cannot refund an order with status "${order.status}"` }), { status: 409 });
  }

  const alreadyRefunded = order.refunded_amount ?? 0;
  const remaining = Number(order.amount) - Number(alreadyRefunded);
  const requestedAmount = body.amount ?? remaining;
  if (requestedAmount <= 0 || requestedAmount > remaining + 0.01) {
    return new Response(JSON.stringify({ error: `Refund amount must be between 0 and ${remaining.toFixed(2)}` }), { status: 400 });
  }

  if (!order.provider_transaction_id) {
    return new Response(JSON.stringify({ error: 'Order has no tracker to refund against' }), { status: 409 });
  }

  try {
    const result = await refundTracker({ tracker: order.provider_transaction_id, amount: requestedAmount, currency: order.currency });

    const newRefundedTotal = Number(alreadyRefunded) + requestedAmount;
    const newStatus = newRefundedTotal >= Number(order.amount) - 0.01 ? 'refunded' : 'partially_refunded';

    const mergedRawResponse = {
      ...(order.raw_response ?? {}),
      last_refund: { amount: requestedAmount, reason: body.reason, by: caller.id, at: new Date().toISOString(), result: redactSensitive(result.raw) },
    };

    await adminClient
      .from('payment_orders')
      .update({ status: newStatus, refunded_amount: newRefundedTotal, raw_response: mergedRawResponse, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    // A full refund undoes the purchase — revoke access immediately rather than let it ride
    // out to expires_at. A partial refund leaves the subscription alone; admins can still use
    // the separate existing "Cancel" action if that's also warranted.
    if (newStatus === 'refunded') {
      await adminClient.from('user_subscriptions').update({ status: 'cancelled' }).eq('payment_order_id', order.id).eq('status', 'active');
    }

    return new Response(JSON.stringify({ status: newStatus, refundedAmount: newRefundedTotal }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Transport/API failure — do not mutate payment_orders at all. Better to let the admin
    // retry than to record a refund that may not have actually gone through.
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Safepay refund failed' }), { status: 502 });
  }
});
