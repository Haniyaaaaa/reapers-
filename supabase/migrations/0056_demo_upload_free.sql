-- Demo uploads are now free for everyone, not a Pro-only entitlement — only the free-tier
-- fallback in effective_limits() changes (from `false` to `true` for demo_upload_allowed);
-- every other entitlement (community/event limits, avatar, expert bookings) keeps its
-- existing default untouched. Mirrors 0050_avatar_custom_free.sql's exact pattern. Without
-- this, the demos_require_subscription trigger (0019/0020) would still reject the insert even
-- after the client-side Pro gate is removed.
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
    case when us.id is null then true else sp.demo_upload_allowed end,
    case when us.id is null then true else sp.avatar_custom_allowed end,
    case when us.id is null then false else sp.expert_booking_allowed end
  from (select uid as u) seed
  left join public.user_subscriptions us
    on us.user_id = seed.u and us.status = 'active' and (us.expires_at is null or us.expires_at > now())
  left join public.subscription_plans sp on sp.id = us.plan_id
  order by us.created_at desc nulls last
  limit 1;
$$;
