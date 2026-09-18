// Public, unauthenticated endpoint — Safepay calls this directly (Dashboard > Developers >
// Endpoints), not the app. No PayFast equivalent existed; the old integration had no webhook
// and no replay protection at all (payfast-3ds-callback trusted its query params outright).
//
// Safepay's documented flow: verify signature -> store the event -> ack 200 within 10s ->
// apply business logic. The `payment_webhook_events` unique constraint (provider, dedupe_key)
// is what makes a replayed delivery a guaranteed no-op instead of a second activation/refund.
//
// CRITICAL ORDERING, do not change: the raw body is read and signature-verified BEFORE any
// JSON.parse call anywhere in this handler. Parsing first and verifying a re-serialized body
// second is exactly the mistake server/email-webhook/README.md already warns about for a
// different webhook — getting this backwards silently breaks signature verification.
//
// Requires Edge Function secrets: SAFEPAY_WEBHOOK_SECRET, SAFEPAY_ENVIRONMENT,
// SAFEPAY_MERCHANT_API_KEY, SAFEPAY_SECRET_KEY.

import { createHash } from 'node:crypto';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyWebhookSignature, getTrackerStatus, trackerStateToOrderStatus, redactSensitive } from '../_shared/safepay.ts';
import { activateSubscriptionForOrder } from '../_shared/subscriptionActivation.ts';

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('X-SFPY-SIGNATURE') ?? req.headers.get('x-sfpy-signature');
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Safepay's exact webhook payload shape (event id field name) could not be confirmed from
  // public docs alone — this fallback chain is deliberately defensive. Revisit once a real
  // payload is captured via the dashboard's "send test webhook" feature (see the README).
  const trackerToken = extractTrackerToken(payload);
  const eventType = typeof payload.event_type === 'string' ? payload.event_type : typeof payload.type === 'string' ? payload.type : null;
  const eventId = typeof payload.id === 'string' ? payload.id : typeof payload.event_id === 'string' ? payload.event_id : null;
  const dedupeKey = eventId ?? createHash('sha256').update(rawBody).digest('hex');

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: inserted, error: insertError } = await adminClient
    .from('payment_webhook_events')
    .insert({ provider: 'safepay', dedupe_key: dedupeKey, event_type: eventType, tracker_token: trackerToken, payload })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      // Replay of an already-seen event — ack it so Safepay stops retrying, do nothing else.
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    // Could not even durably store the event — safer to let Safepay retry than to silently
    // drop it, so this is the one case that does NOT return 200.
    console.error('safepay-webhook: failed to store event', insertError);
    return new Response('Could not record event', { status: 500 });
  }

  // From here on, the event is durably stored — always ack 200, even if a downstream step
  // throws, since the event is safely inspectable/reprocessable via payment_webhook_events
  // rather than needing Safepay to keep retrying a delivery that already succeeded.
  try {
    if (trackerToken) {
      const { data: order } = await adminClient.from('payment_orders').select('*').eq('provider_transaction_id', trackerToken).maybeSingle();
      if (order) {
        // Re-fetch the tracker's live status rather than trusting the webhook payload's own
        // fields — defensive against an unconfirmed payload shape, and keeps this and
        // safepay-verify-payment's interpretation of "what happened" identical.
        const trackerStatus = await getTrackerStatus(trackerToken);
        const mapped = trackerStateToOrderStatus(trackerStatus.state);

        if (mapped === 'completed') {
          await activateSubscriptionForOrder(adminClient, order.id);
        } else if (mapped === 'refunded' || mapped === 'partially_refunded') {
          await adminClient
            .from('payment_orders')
            .update({ status: mapped, raw_response: redactSensitive(trackerStatus.raw), updated_at: new Date().toISOString() })
            .eq('id', order.id);
        } else if (mapped === 'disputed') {
          await adminClient
            .from('payment_orders')
            .update({ status: 'disputed', disputed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', order.id);
        } else if (mapped === 'failed') {
          // Only downgrade a still-pending order — never clobber a completed/refunded one
          // with a stale/out-of-order failure webhook.
          await adminClient
            .from('payment_orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', order.id)
            .eq('status', 'pending');
        }
      }
      // No matching order: nothing to do (e.g. a stale sandbox test event) — still 200 below.
    }
    await adminClient.from('payment_webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', inserted!.id);
  } catch (err) {
    console.error('safepay-webhook: business logic failed for a stored event', inserted?.id, err);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

function extractTrackerToken(payload: Record<string, unknown>): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const tracker = data?.tracker as Record<string, unknown> | undefined;
  if (typeof tracker?.token === 'string') return tracker.token;
  if (typeof payload.tracker === 'string') return payload.tracker;
  return null;
}
