-- Demo uploads are free until an admin actually puts them in a plan. The free-tier fallback
-- for demo_upload_allowed was hardcoded `true` (0056); it now derives from the plans
-- themselves: free for everyone while NO active plan has demo_upload_allowed = true, and
-- restricted to subscribers on such a plan as soon as one does. Toggle it per plan in
-- Admin -> Subscriptions ("Demo uploads").
--
-- The seeded Pro plan (0020) had demo_upload_allowed = true, which under this rule would make
-- uploads paid immediately — turned off here so the current behaviour (free) is preserved
-- until an admin deliberately enables it on a plan.
update public.subscription_plans set demo_upload_allowed = false where name = 'Pro';

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
    case when us.id is null then false else sp.expert_booking_allowed end
  from (select uid as u) seed
  left join public.user_subscriptions us
    on us.user_id = seed.u and us.status = 'active' and (us.expires_at is null or us.expires_at > now())
  left join public.subscription_plans sp on sp.id = us.plan_id
  order by us.created_at desc nulls last
  limit 1;
$$;

grant execute on function public.effective_limits(uuid) to authenticated;
