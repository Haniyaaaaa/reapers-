-- Makes what a plan unlocks admin-configurable per plan, instead of a single hardcoded
-- "any active subscription unlocks everything" rule from 0019. An admin creating a plan can
-- now set: how many communities/events it allows (null = unlimited), and whether it includes
-- demo uploads, custom avatar photos, and expert bookings.

alter table public.subscription_plans
  add column community_limit int,   -- null = unlimited under this plan
  add column event_limit int,       -- null = unlimited under this plan
  add column demo_upload_allowed boolean not null default false,
  add column avatar_custom_allowed boolean not null default false,
  add column expert_booking_allowed boolean not null default false;

-- The seeded Pro plan (0019) keeps its original "unlocks everything" intent explicitly.
update public.subscription_plans
set community_limit = null, event_limit = null, demo_upload_allowed = true, avatar_custom_allowed = true, expert_booking_allowed = true
where name = 'Pro';

-- Resolves what a user is actually entitled to right now: their active plan's columns if
-- they have one, otherwise the free-tier defaults (1 community, 3 events, nothing else).
-- Always returns exactly one row, so callers never need to handle "no active subscription"
-- as a separate case.
create or replace function public.effective_limits(uid uuid)
returns table(
  community_limit int,
  event_limit int,
  demo_upload_allowed boolean,
  avatar_custom_allowed boolean,
  expert_booking_allowed boolean
)
language sql stable as $$
  select
    case when us.id is null then 1 else sp.community_limit end,
    case when us.id is null then 3 else sp.event_limit end,
    case when us.id is null then false else sp.demo_upload_allowed end,
    case when us.id is null then false else sp.avatar_custom_allowed end,
    case when us.id is null then false else sp.expert_booking_allowed end
  from (select uid as u) seed
  left join public.user_subscriptions us
    on us.user_id = seed.u and us.status = 'active' and (us.expires_at is null or us.expires_at > now())
  left join public.subscription_plans sp on sp.id = us.plan_id
  order by us.created_at desc nulls last
  limit 1;
$$;

-- Replace the fixed-limit triggers from 0019 with ones that read effective_limits() instead
-- of a hardcoded per-table max, so changing a plan's limits in the admin console takes effect
-- immediately with no migration needed.
drop trigger if exists communities_limit on public.communities;
drop trigger if exists events_limit on public.events;
drop trigger if exists demos_require_subscription on public.demos;
drop trigger if exists bookings_require_subscription on public.bookings;
drop function if exists public.enforce_creation_limit();
drop function if exists public.enforce_subscription_required();

create or replace function public.enforce_community_limit()
returns trigger language plpgsql as $$
declare
  lim record;
  current_count int;
begin
  select * into lim from public.effective_limits(new.created_by);
  if lim.community_limit is null then
    return new;
  end if;
  select count(*) into current_count from public.communities where created_by = new.created_by;
  if current_count >= lim.community_limit then
    raise exception 'Community limit reached for your plan — upgrade to add more.' using errcode = '55007';
  end if;
  return new;
end;
$$;
create trigger communities_limit before insert on public.communities
  for each row execute function public.enforce_community_limit();

create or replace function public.enforce_event_limit()
returns trigger language plpgsql as $$
declare
  lim record;
  current_count int;
begin
  select * into lim from public.effective_limits(new.host_id);
  if lim.event_limit is null then
    return new;
  end if;
  select count(*) into current_count from public.events where host_id = new.host_id;
  if current_count >= lim.event_limit then
    raise exception 'Event limit reached for your plan — upgrade to post more.' using errcode = '55007';
  end if;
  return new;
end;
$$;
create trigger events_limit before insert on public.events
  for each row execute function public.enforce_event_limit();

create or replace function public.enforce_demo_upload_allowed()
returns trigger language plpgsql as $$
declare lim record;
begin
  select * into lim from public.effective_limits(new.developer_id);
  if not lim.demo_upload_allowed then
    raise exception 'Uploading demos requires a plan that includes demo uploads.' using errcode = '55007';
  end if;
  return new;
end;
$$;
create trigger demos_require_subscription before insert on public.demos
  for each row execute function public.enforce_demo_upload_allowed();

create or replace function public.enforce_booking_allowed()
returns trigger language plpgsql as $$
declare lim record;
begin
  select * into lim from public.effective_limits(new.requester_id);
  if not lim.expert_booking_allowed then
    raise exception 'Booking an expert requires a plan that includes expert bookings.' using errcode = '55007';
  end if;
  return new;
end;
$$;
create trigger bookings_require_subscription before insert on public.bookings
  for each row execute function public.enforce_booking_allowed();

-- Avatar gate now checks the plan's avatar_custom_allowed instead of a flat has_active_subscription.
create or replace function public.enforce_avatar_subscription()
returns trigger language plpgsql as $$
declare lim record;
begin
  if new.avatar_uri is not null and new.avatar_uri is distinct from old.avatar_uri and not public.is_admin() then
    select * into lim from public.effective_limits(new.id);
    if not lim.avatar_custom_allowed then
      raise exception 'Custom avatar photos require a plan that includes avatar customization.' using errcode = '55007';
    end if;
  end if;
  return new;
end;
$$;
-- Trigger already exists from 0019 (profiles_avatar_subscription_gate) — replacing the
-- function body is sufficient, no need to drop/recreate the trigger itself.
