// Shared client for Safepay (getsafepay.com) — used by safepay-create-checkout,
// safepay-verify-payment, safepay-webhook and safepay-refund so the SDK setup, amount-unit
// assumption, tracker-state interpretation, and webhook signature verification all live in
// exactly one place.
//
// Uses Safepay's official `@sfpy/node-core` SDK (via Deno's `npm:` specifier support) rather
// than hand-rolled HTTP calls, per the locked integration decision — the hosted-checkout-URL
// format is otherwise undocumented. Endpoints/method names below were confirmed by reading the
// installed package's own source (node_modules/@sfpy/node-core@0.3.5's compiled cjs + .d.ts
// files), not guessed from doc prose:
//   safepay.payments.session.setup(data)        -> POST /order/payments/v3/      (create tracker)
//   safepay.client.passport.create()            -> POST /client/passport/v1/token (get tbt)
//   safepay.checkout.createCheckoutUrl({...})   -> pure string builder, no network call
//   safepay.reporter.payments.fetch(tracker)    -> GET  /reporter/api/v1/payments/{tracker}
//   safepay.order.cancel.refund(tracker, data)  -> POST /order/payments/v3/{tracker}/refund
//
// KNOWN PACKAGING BUG (confirmed by reading the installed package, not a guess): the SDK's
// AxiosHttpClient does `require("axios")` at runtime, but `@sfpy/node-core`'s own package.json
// lists axios only under devDependencies, not dependencies. Deno's npm: resolver only fetches
// declared (non-dev) dependencies, so a bare `import "npm:@sfpy/node-core"` will likely fail at
// runtime with a missing-module error for axios. The explicit `import "npm:axios@^1.6.8"` below
// works around this by forcing axios into this function's resolved npm dependency graph. THIS
// MUST BE SMOKE-TESTED against a real deployed Supabase Edge Function before relying on it —
// see the pre-launch checklist in supabase/functions/README-safepay-setup.md.
import 'npm:axios@^1.6.8';
import Safepay from 'npm:@sfpy/node-core@0.3.5';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

type SafepayEnvironment = 'sandbox' | 'production';

const ENVIRONMENT = (Deno.env.get('SAFEPAY_ENVIRONMENT') as SafepayEnvironment | undefined) ?? 'sandbox';
const MERCHANT_API_KEY = Deno.env.get('SAFEPAY_MERCHANT_API_KEY');
const SECRET_KEY = Deno.env.get('SAFEPAY_SECRET_KEY');
const WEBHOOK_SECRET = Deno.env.get('SAFEPAY_WEBHOOK_SECRET');

const HOSTS: Record<SafepayEnvironment, string> = {
  sandbox: 'https://sandbox.api.getsafepay.com',
  production: 'https://api.getsafepay.com',
};

export function assertSafepayConfigured(): void {
  if (!MERCHANT_API_KEY || !SECRET_KEY) {
    throw new Error('Safepay credentials are not configured');
  }
}

let client: InstanceType<typeof Safepay> | null = null;
function getClient() {
  assertSafepayConfigured();
  if (!client) {
    client = new Safepay(SECRET_KEY!, { authType: 'secret', host: HOSTS[ENVIRONMENT] });
  }
  return client;
}

// UNVERIFIED ASSUMPTION (isolated here on purpose): Safepay's docs example uses
// `amount: 10000` for a $100.00 USD charge, implying amount is expressed in minor units
// (x100) the same way Stripe et al. do. This has NOT been confirmed for PKR specifically.
// If a real sandbox transaction shows the hosted page displaying the wrong amount (100x too
// high or too low), flip this one constant rather than hunting through call sites.
const SAFEPAY_AMOUNT_IS_MINOR_UNITS = true;
export function toSafepayAmount(majorUnitsAmount: number): number {
  return SAFEPAY_AMOUNT_IS_MINOR_UNITS ? Math.round(majorUnitsAmount * 100) : Math.round(majorUnitsAmount);
}

export type CreateTrackerParams = { amount: number; currency: string; orderId: string };
export type CreateTrackerResult = { token: string; state: string; raw: Record<string, unknown> };

export async function createTracker(p: CreateTrackerParams): Promise<CreateTrackerResult> {
  const safepay = getClient();
  const res = await safepay.payments.session.setup({
    merchant_api_key: MERCHANT_API_KEY,
    intent: 'CYBERSOURCE',
    mode: 'payment',
    entry_mode: 'raw',
    currency: p.currency,
    amount: toSafepayAmount(p.amount),
    metadata: { order_id: p.orderId },
    include_fees: false,
  });
  const tracker = res?.data?.tracker;
  if (!tracker?.token) {
    throw new Error(`Safepay tracker creation failed: ${JSON.stringify(res)}`);
  }
  return { token: tracker.token as string, state: tracker.state as string, raw: res as Record<string, unknown> };
}

export async function createPassportToken(): Promise<string> {
  const safepay = getClient();
  const res = await safepay.client.passport.create();
  const token = res?.data;
  if (!token || typeof token !== 'string') {
    throw new Error(`Safepay passport token request failed: ${JSON.stringify(res)}`);
  }
  return token;
}

export type GetCheckoutUrlParams = {
  tracker: string;
  tbt: string;
  redirectUrl: string;
  cancelUrl: string;
  orderId: string;
};

export function getCheckoutUrl(p: GetCheckoutUrlParams): string {
  const safepay = getClient();
  return safepay.checkout.createCheckoutUrl({
    env: ENVIRONMENT,
    tracker: p.tracker,
    tbt: p.tbt,
    source: 'hosted',
    order_id: p.orderId,
    redirect_url: p.redirectUrl,
    cancel_url: p.cancelUrl,
  });
}

export type TrackerStatus = {
  state: string;
  cardType?: string;
  lastFour?: string;
  raw: Record<string, unknown>;
};

export async function getTrackerStatus(trackerToken: string): Promise<TrackerStatus> {
  const safepay = getClient();
  const res = await safepay.reporter.payments.fetch(trackerToken);
  const tracker = res?.data?.tracker;
  if (!tracker?.state) {
    throw new Error(`Safepay payment status lookup failed: ${JSON.stringify(res)}`);
  }
  const paymentMethod = res?.data?.action?.payment_method;
  return {
    state: tracker.state as string,
    cardType: paymentMethod?.card_type,
    lastFour: paymentMethod?.last_four,
    raw: res as Record<string, unknown>,
  };
}

export type RefundParams = { tracker: string; amount: number; currency: string };

export async function refundTracker(p: RefundParams): Promise<{ raw: Record<string, unknown> }> {
  const safepay = getClient();
  const res = await safepay.order.cancel.refund(p.tracker, {
    currency: p.currency,
    amount: toSafepayAmount(p.amount),
  });
  return { raw: res as Record<string, unknown> };
}

// Every tracker state Safepay documents, mapped to this app's payment_orders.status values.
// Both safepay-verify-payment and safepay-webhook call this single function so their
// interpretation of a given state can never drift apart from each other.
export type OrderStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'disputed';

export function trackerStateToOrderStatus(state: string): OrderStatus {
  switch (state) {
    case 'TRACKER_STARTED':
    case 'TRACKER_AUTHORIZED':
    case 'TRACKER_ENROLLED':
      return 'pending';
    case 'TRACKER_ENDED':
      return 'completed';
    case 'TRACKER_CANCELLED':
    case 'TRACKER_EXPIRED':
    case 'TRACKER_REVERSED':
    case 'TRACKER_VOIDED':
      return 'failed';
    case 'TRACKER_REFUNDED':
      return 'refunded';
    case 'TRACKER_PARTIAL_REFUND':
      return 'partially_refunded';
    case 'TRACKER_DISPUTED':
      return 'disputed';
    default:
      // An unrecognized/future state is treated as still pending rather than guessed at —
      // safer than silently mapping to a terminal status we can't back up.
      return 'pending';
  }
}

// Verifies X-SFPY-SIGNATURE: HMAC-SHA512 of the raw request body, using the per-endpoint
// webhook secret (NOT the API secret key). Callers MUST pass the exact raw bytes read before
// any JSON.parse — see safepay-webhook/index.ts's header comment for why this ordering matters.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;
  const expected = createHmac('sha512', WEBHOOK_SECRET).update(rawBody, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signatureHeader, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

// Hosted checkout means no raw card data ever reaches this backend at all (unlike PayFast's
// direct-API model) — this only trims the tracker-status response down to what's safe/useful
// to persist in payment_orders.raw_response, in case a future response shape ever embeds more
// than card_type/last_four.
export function redactSensitive(payload: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const action = clone.data && (clone.data as Record<string, unknown>).action;
  if (action && typeof action === 'object') {
    const paymentMethod = (action as Record<string, unknown>).payment_method;
    if (paymentMethod && typeof paymentMethod === 'object') {
      (action as Record<string, unknown>).payment_method = {
        card_type: (paymentMethod as Record<string, unknown>).card_type,
        last_four: (paymentMethod as Record<string, unknown>).last_four,
      };
    }
  }
  return clone;
}
