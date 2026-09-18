-- Custom avatar photos are now free for everyone, not a Pro-only entitlement — only the
-- free-tier fallback in effective_limits() changes (from `false` to `true` for
-- avatar_custom_allowed); every other entitlement (community/event limits, demo uploads,
-- expert bookings) keeps its existing free-tier default untouched.
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
    case when us.id is null then true else sp.avatar_custom_allowed end,
    case when us.id is null then false else sp.expert_booking_allowed end
  from (select uid as u) seed
  left join public.user_subscriptions us
    on us.user_id = seed.u and us.status = 'active' and (us.expires_at is null or us.expires_at > now())
  left join public.subscription_plans sp on sp.id = us.plan_id
  order by us.created_at desc nulls last
  limit 1;
$$;
