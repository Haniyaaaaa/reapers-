-- Replaces PayFast Pakistan with Safepay (getsafepay.com) as the subscription payment
-- gateway. Every change here is additive/widening — historical payment_orders rows with
-- provider='payfast' remain valid and untouched; nothing here touches user_subscriptions,
-- has_active_subscription(), the enforce_* gating triggers, or event_payment_applications
-- (the unrelated manual bank-transfer event-ticket flow), all of which are provider-agnostic.

-- 1. Widen payment_orders.status to add the terminal states a real refund/dispute API can
--    report (0019_payfast_subscriptions.sql only ever needed pending/completed/failed, since
--    PayFast's integration never had a refund or dispute path wired to anything).
alter table public.payment_orders
  drop constraint payment_orders_status_check,
  add constraint payment_orders_status_check
    check (status in ('pending', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed'));

-- 2. Track how much of an order has been refunded (supports partial refunds, still allows
--    computing the remaining refundable balance) and when a dispute was recorded.
alter table public.payment_orders
  add column refunded_amount numeric,
  add column disputed_at timestamptz;

-- 3. Webhook replay protection — Safepay's own docs recommend "verify signature -> store the
--    event -> ack 200 -> apply business logic"; the unique constraint below is what makes a
--    replayed delivery a guaranteed no-op instead of a second activation/refund application.
--    RLS is enabled with zero policies: like payment_orders' write side, only the service-role
--    safepay-webhook Edge Function ever touches this table.
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'safepay',
  dedupe_key text not null,
  event_type text,
  tracker_token text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, dedupe_key)
);
create index payment_webhook_events_tracker_idx on public.payment_webhook_events (tracker_token);
alter table public.payment_webhook_events enable row level security;
