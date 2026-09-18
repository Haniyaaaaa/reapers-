-- Real PayFast Pakistan billing for the Pro subscription (2500 PKR / 30 days) plus
-- hard server-side enforcement of the free-tier limits it unlocks. Reverses, deliberately,
-- the "intent-only, no payment processor" pattern used by every other monetization surface
-- in this app (see 0012_onboarding_addendum.sql's original comment on user_subscriptions).

alter table public.user_subscriptions
  add column expires_at timestamptz,
  add column payment_order_id uuid;

alter table public.user_subscriptions
  drop constraint user_subscriptions_status_check,
  add constraint user_subscriptions_status_check check (status in ('active', 'cancelled', 'expired'));

-- Pro is a one-time payment that unlocks a 30-day window, not gateway-managed recurring
-- billing (PayFast Pakistan's docs don't confirm a recurring/tokenized-billing API).
alter table public.subscription_plans
  drop constraint subscription_plans_billing_interval_check,
  add constraint subscription_plans_billing_interval_check check (billing_interval in ('monthly', 'yearly', '30_days'));

insert into public.subscription_plans (name, price, billing_interval, is_active)
values ('Pro', 2500, '30_days', true)
on conflict do nothing;

-- One row per checkout attempt, decoupled from user_subscriptions until PayFast confirms
-- payment. Written only by the payfast-create-checkout / payfast-verify-payment Edge
-- Functions (service role) — no client insert/update policy exists at all.
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  amount numeric not null,
  currency text not null default 'PKR',
  provider text not null default 'payfast',
  provider_order_id text unique not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_orders_user_idx on public.payment_orders(user_id, created_at desc);
alter table public.payment_orders enable row level security;
create policy "payment_orders_select_own"
  on public.payment_orders for select
  using (user_id = auth.uid() or public.is_admin());

-- Single predicate reused by every gating trigger below.
create or replace function public.has_active_subscription(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_subscriptions
    where user_id = uid and status = 'active' and (expires_at is null or expires_at > now())
  );
$$;

-- Free-tier count limits (communities: 1, events: 3) — unlimited once subscribed.
create or replace function public.enforce_creation_limit()
returns trigger language plpgsql as $$
declare
  owner_col text := tg_argv[0];
  max_free int := tg_argv[1]::int;
  owner_id uuid;
  current_count int;
begin
  execute format('select ($1).%I', owner_col) into owner_id using new;
  if public.has_active_subscription(owner_id) then
    return new;
  end if;
  execute format('select count(*) from %I where %I = $1', tg_table_name, owner_col) into current_count using owner_id;
  if current_count >= max_free then
    raise exception 'Free plan limit reached — upgrade to Pro to add more.' using errcode = '55007';
  end if;
  return new;
end;
$$;

create trigger communities_limit before insert on public.communities
  for each row execute function public.enforce_creation_limit('created_by', 1);
create trigger events_limit before insert on public.events
  for each row execute function public.enforce_creation_limit('host_id', 3);

-- Zero free allowance (demos, bookings) — no counting needed, just a subscription check.
create or replace function public.enforce_subscription_required()
returns trigger language plpgsql as $$
declare
  owner_col text := tg_argv[0];
  owner_id uuid;
begin
  execute format('select ($1).%I', owner_col) into owner_id using new;
  if not public.has_active_subscription(owner_id) then
    raise exception 'This feature requires an active Pro subscription.' using errcode = '55007';
  end if;
  return new;
end;
$$;

create trigger demos_require_subscription before insert on public.demos
  for each row execute function public.enforce_subscription_required('developer_id');
create trigger bookings_require_subscription before insert on public.bookings
  for each row execute function public.enforce_subscription_required('requester_id');

-- Custom avatar photo upload — gated on profiles UPDATE, only when avatar_uri is actually
-- being set to something new. Preset avatars (avatar_id/avatar_look) are untouched and free.
-- Admins can still set any user's avatar via profiles_update_by_admin without a subscription.
create or replace function public.enforce_avatar_subscription()
returns trigger language plpgsql as $$
begin
  if new.avatar_uri is not null and new.avatar_uri is distinct from old.avatar_uri
     and not public.is_admin() and not public.has_active_subscription(new.id) then
    raise exception 'Custom avatar photos require an active Pro subscription.' using errcode = '55007';
  end if;
  return new;
end;
$$;
create trigger profiles_avatar_subscription_gate before update on public.profiles
  for each row execute function public.enforce_avatar_subscription();
