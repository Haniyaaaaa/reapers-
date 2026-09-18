-- Adapts payment_orders for PayFast Pakistan's real direct/API-based gateway (see
-- supabase/functions/_shared/payfast.ts): the merchant app collects payment details itself and
-- gets back PayFast's own transaction_id from /customer/validate, distinct from our
-- provider_order_id (basket_id). Superseded the hosted-checkout-redirect assumption 0019 made.

alter table public.payment_orders
  add column payment_method text check (payment_method in ('card', 'bank_account', 'wallet')),
  add column provider_transaction_id text,
  add column masked_account text;
