# Safepay billing setup

Reapers bills its Pro subscription through [Safepay](https://getsafepay.com) using its
hosted-checkout ("Express Checkout") flow: `safepay-create-checkout` opens a payment session
and returns a checkout URL, the app opens that in an in-app browser
(`expo-web-browser`'s `WebBrowser.openAuthSessionAsync`, same pattern as the app's Google/Apple
login), and `safepay-verify-payment` + `safepay-webhook` both confirm the outcome server-side.
No raw card data ever reaches this backend.

## Setup

1. Create a Safepay account, then a **separate sandbox account** (sandbox and live are fully
   separate per Safepay's own docs) — see https://safepay-docs.netlify.app/developers/safepay/sandbox-environment.
2. Grab your API keys: Dashboard → Developers → API keys → note the merchant API key and the
   secret key.
3. Register the webhook endpoint: Dashboard → Developers → Endpoints → Add an endpoint → URL:
   `https://<your-project-ref>.supabase.co/functions/v1/safepay-webhook` → subscribe to every
   payment/refund/dispute event shown → Safepay shows a per-endpoint signing secret once, copy
   it immediately.
4. Set the Edge Function secrets:
   ```
   supabase secrets set SAFEPAY_ENVIRONMENT=sandbox
   supabase secrets set SAFEPAY_MERCHANT_API_KEY=...
   supabase secrets set SAFEPAY_SECRET_KEY=...
   supabase secrets set SAFEPAY_WEBHOOK_SECRET=...
   ```
5. Deploy: `supabase functions deploy safepay-create-checkout safepay-verify-payment safepay-webhook safepay-refund`.
6. Test cards: https://safepay-docs.netlify.app/developers/safepay/test-cards (frictionless
   success, 3DS step-up, decline, and timeout cards — use the link rather than a hardcoded list
   here since it's the authoritative, occasionally-updated source).

## Pre-launch verification checklist

Several details of Safepay's API were confirmed by reading the installed `@sfpy/node-core`
SDK's own source rather than guessed, but a few things can only be confirmed against a real
sandbox transaction — **do not go live without checking these**:

- [ ] **Amount units for PKR.** `_shared/safepay.ts`'s `SAFEPAY_AMOUNT_IS_MINOR_UNITS` constant
      assumes amount is expressed ×100 (minor units), based on Safepay's own USD example.
      Create one real sandbox tracker for e.g. Rs 100 and confirm the hosted checkout page
      displays "Rs 100.00", not "Rs 1.00" or "Rs 10,000.00". Flip the constant if wrong.
- [ ] **Axios packaging bug.** `@sfpy/node-core@0.3.5`'s own `package.json` lists `axios` only
      under `devDependencies`, but its `AxiosHttpClient` `require("axios")`s it at runtime —
      confirmed by reading the package directly. `_shared/safepay.ts` works around this with an
      explicit `import "npm:axios@^1.6.8"` to force it into the resolved dependency graph. This
      **must** be smoke-tested against a real deployed Edge Function (not just
      `supabase functions serve` locally) before relying on it — deploy `safepay-create-checkout`
      and make one real call first.
- [ ] **`redirect_url`/`cancel_url` accepting a bare `reapers://` scheme.** If Safepay's hosted
      page rejects a non-HTTPS redirect URL, `safepay-create-checkout` needs a small public
      relay function in front of it (shaped like the old `payfast-3ds-callback`: receive the
      query params, respond with an HTML page that does `window.location.replace('reapers://safepay-return?...')`).
- [ ] **Webhook payload shape.** The exact event-id field name Safepay's webhooks use wasn't
      confirmed from public docs. `safepay-webhook/index.ts`'s dedupe-key logic falls back to
      hashing the raw body if no recognizable id field is found — safe, but capture one real
      payload via the dashboard's "send test webhook" feature and confirm/tighten the field-name
      guess once you have it.
- [ ] **Refund endpoint.** Confirmed via the SDK's `order.cancel.refund(tracker, {currency, amount})`
      method — test one real sandbox refund end-to-end via the new admin UI
      (AdminSubscriptionsScreen → a subscriber → "View payments" → "Refund").
- [ ] **Full flow, end to end:** sandbox purchase → `safepay-webhook` lands → `user_subscriptions`
      activates → admin issues a refund → order status flips to `refunded` and the subscription
      is cancelled.
- [ ] **Duplicate webhook delivery is a no-op.** Manually resend the same webhook payload twice
      (or trigger a natural retry) and confirm the second delivery returns 200 without
      re-running any business logic — visible via a single row in `payment_webhook_events` for
      that delivery.

## What doesn't change in the app

`PaymentResultScreen`'s deep link (`reapers://payment-result`) is unchanged — still the
fallback route if the app is backgrounded or killed mid-checkout, registered in
`src/navigation/linking.ts`.
