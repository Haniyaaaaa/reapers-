-- Expert bookings are free for everyone at launch, not a Pro-only entitlement. Same shape as
-- 0057_demo_upload_plan_gated.sql: the expert_booking_allowed fallback now derives from the
-- plans themselves — free for everyone while NO active plan has expert_booking_allowed = true,
-- and restricted to subscribers on such a plan as soon as an admin turns it on for one
-- (Admin -> Subscriptions -> "Expert bookings").
--
-- The seeded Pro plan (0020) had expert_booking_allowed = true, which under this rule would keep
-- bookings paid — turned off here so bookings stay free until an admin deliberately enables it.
--
-- Unlike the demo-upload rule, subscribers are allowed too while nothing gates it, so paying
-- users never end up with fewer rights than free ones.
update public.subscription_plans set expert_booking_allowed = false where name = 'Pro';

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
    case when us.id is null
      then not exists (select 1 from public.subscription_plans p where p.is_active and p.demo_upload_allowed)
      else sp.demo_upload_allowed end,
    case when us.id is null then true else sp.avatar_custom_allowed end,
    (not exists (select 1 from public.subscription_plans p where p.is_active and p.expert_booking_allowed))
      or coalesce(sp.expert_booking_allowed, false)
  from (select uid as u) seed
  left join public.user_subscriptions us
    on us.user_id = seed.u and us.status = 'active' and (us.expires_at is null or us.expires_at > now())
  left join public.subscription_plans sp on sp.id = us.plan_id
  order by us.created_at desc nulls last
  limit 1;
$$;

grant execute on function public.effective_limits(uuid) to authenticated;
