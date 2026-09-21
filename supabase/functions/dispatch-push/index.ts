// Dispatches a device push notification via Expo's Push API whenever a row is inserted into
// public.notifications. Wired up via a Supabase Database Webhook (Dashboard > Database >
// Webhooks: table=notifications, event=INSERT, target=this function's URL) — not deployed by
// this codebase; the user runs `supabase functions deploy dispatch-push` and creates the
// webhook against their own project when ready. Uses Expo's push service (not raw FCM/APNs),
// so no Firebase project or Apple push key needs to be configured for this function itself —
// Expo's service is what actually talks to FCM/APNs on the developer's behalf at send time.
//
// Setup also requires, once deployed:
//   1. `supabase secrets set DISPATCH_PUSH_SECRET=<a random string you generate>`
//   2. In the Database Webhook's config (Dashboard > Database > Webhooks), add a custom HTTP
//      header `x-webhook-secret: <the same random string>` — this is what proves a request
//      actually came from your Database Webhook rather than anyone who has the (public) anon
//      key, since the platform's own JWT check doesn't distinguish the two.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type NotificationInsertPayload = {
  record: {
    id: string;
    user_id: string;
    title: string;
    body: string;
    target: unknown;
  };
};

Deno.serve(async (req) => {
  // The Database Webhook config's Authorization header is satisfied by the public anon key
  // (a static header value, not a per-caller JWT), which proves nothing since that key ships
  // inside the app bundle — anyone could otherwise call this function directly and push
  // arbitrary title/body to any user_id's devices. This shared secret (set once as an Edge
  // Function secret, and configured as a custom header on the Database Webhook itself — see
  // supabase secrets set DISPATCH_PUSH_SECRET=... and the webhook's "HTTP Headers" section in
  // the dashboard) is the actual caller check.
  // Fails closed (same pattern as the email webhook's SUPABASE_AUTH_HOOK_SECRET check) —
  // an unset or mismatched secret rejects the request rather than silently trusting it.
  const expected = Deno.env.get('DISPATCH_PUSH_SECRET');
  if (!expected || req.headers.get('x-webhook-secret') !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const payload = (await req.json()) as NotificationInsertPayload;
  const { user_id, title, body, target } = payload.record;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service-role only: push_tokens has no client select policy
  );

  const { data: tokens, error } = await supabase.from('push_tokens').select('token').eq('user_id', user_id);
  if (error || !tokens?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  // `target` (the same {screen, id?} shape NotificationsScreen already uses to navigate on
  // tap in-app) rides along as the push's `data` payload, so a tapped notification carries
  // the same routing info out-of-app — the app's push-response handler reads this to deep-link.
  // channelId must match the channel the app creates (registerForPush.ts); priority 'high' lets
  // Android deliver while the phone is idle/dozing instead of batching it for later.
  const messages = tokens.map((t) => ({ to: t.token, title, body, sound: 'default', priority: 'high', channelId: 'default', data: { target } }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  // Expo answers 200 even when a push is rejected — the per-message result is in the body
  // (e.g. DeviceNotRegistered, InvalidCredentials for missing FCM/APNs setup). Read it, drop
  // dead tokens, and log failures so a "no notification" report is diagnosable from the
  // function logs instead of silent.
  const result = (await res.json().catch(() => null)) as { data?: { status: string; message?: string; details?: { error?: string } }[] } | null;
  const tickets = result?.data ?? [];
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    if (t.status !== 'ok') {
      console.error('expo push rejected', { user_id, message: t.message, error: t.details?.error });
      if (t.details?.error === 'DeviceNotRegistered') dead.push(tokens[i].token);
    }
  });
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);

  return new Response(JSON.stringify({ sent: messages.length, expoStatus: res.status, tickets }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
