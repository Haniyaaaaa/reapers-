// Step 1 of Safepay's "Express Checkout" hosted-redirect flow (replaces payfast-validate-payment,
// which collected raw card/bank details directly — hosted checkout means this app never sees
// card data at all). Called from the app via
// supabase.functions.invoke('safepay-create-checkout', { body: { planId } }), JWT-authenticated.
//
// Creates a pending payment_orders row, opens a Safepay tracker (payment session), gets a
// short-lived "tbt" passport token, and builds the hosted checkout URL. The client opens that
// URL via expo-web-browser's WebBrowser.openAuthSessionAsync and finishes with
// safepay-verify-payment once the browser session returns.
//
// The tracker token is stored as provider_transaction_id immediately (unlike PayFast, where the
// transaction id only existed after a later step) so both safepay-verify-payment and
// safepay-webhook can look this order up by it right away.
//
// redirect_url/cancel_url point straight at the app's own reapers:// custom scheme, mirroring
// how signInWithOAuthProvider (src/services/supabase/auth.ts) already redirects an OAuth
// provider straight back into the app with no relay server in between. If sandbox testing shows
// Safepay's hosted page rejects a non-HTTPS redirect_url, this needs a small public relay
// function shaped like the old payfast-3ds-callback — see the pre-launch checklist in
// supabase/functions/README-safepay-setup.md.
//
// Requires Edge Function secrets: SAFEPAY_ENVIRONMENT, SAFEPAY_MERCHANT_API_KEY, SAFEPAY_SECRET_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createTracker, createPassportToken, getCheckoutUrl, redactSensitive } from '../_shared/safepay.ts';

type CreateCheckoutBody = { planId?: string };

const SAFEPAY_RETURN_URL = 'reapers://safepay-return';
const SAFEPAY_CANCEL_URL = 'reapers://safepay-return?cancelled=1';

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

  const body = (await req.json().catch(() => ({}))) as CreateCheckoutBody;
  if (!body.planId) {
    return new Response(JSON.stringify({ error: 'planId is required' }), { status: 400 });
  }

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Price is always read server-side from subscription_plans — the client never supplies (and
  // structurally cannot supply, since the request body only has planId) an amount at all.
  const { data: plan, error: planError } = await adminClient
    .from('subscription_plans')
    .select('id, price')
    .eq('id', body.planId)
    .eq('is_active', true)
    .single();
  if (planError || !plan) {
    return new Response(JSON.stringify({ error: 'Plan not found or inactive' }), { status: 404 });
  }

  const providerOrderId = crypto.randomUUID();

  const { data: order, error: orderError } = await adminClient
    .from('payment_orders')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      amount: plan.price,
      currency: 'PKR',
      provider: 'safepay',
      provider_order_id: providerOrderId,
      status: 'pending',
    })
    .select('id')
    .single();
  if (orderError || !order) {
    return new Response(JSON.stringify({ error: orderError?.message ?? 'Could not create order' }), { status: 500 });
  }

  try {
    const tracker = await createTracker({ amount: plan.price, currency: 'PKR', orderId: providerOrderId });
    const tbt = await createPassportToken();
    const checkoutUrl = getCheckoutUrl({
      tracker: tracker.token,
      tbt,
      redirectUrl: SAFEPAY_RETURN_URL,
      cancelUrl: SAFEPAY_CANCEL_URL,
      orderId: providerOrderId,
    });

    await adminClient
      .from('payment_orders')
      .update({
        provider_transaction_id: tracker.token,
        // Never persist the tbt token itself — it's a (short-lived) bearer credential.
        raw_response: redactSensitive({ tracker: tracker.raw }),
      })
      .eq('id', order.id);

    return new Response(JSON.stringify({ orderId: providerOrderId, checkoutUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    await adminClient.from('payment_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Safepay checkout creation failed' }), {
      status: 502,
    });
  }
});
