-- Free-tier caps (1 community / 3 events for anyone without a subscription) were always on, which
-- blocks testing and launch-time usage. Same approach already used for demo uploads (0056/0057)
-- and expert booking (0068): everything is free/unlimited UNTIL an admin defines limits in a
-- plan. As soon as any active subscription plan sets a community or event limit (or
-- platform_settings.enforce_free_tier_limits is switched on), people without a subscription fall
-- back to the free-tier caps again, and subscribers always get their plan's own numbers.
-- The switch for when you're ready to enforce the free-tier caps regardless of how plans are
-- configured (e.g. you only have an unlimited "Pro" plan and want everyone else capped):
--   update public.platform_settings set enforce_free_tier_limits = true;
create table if not exists public.platform_settings (
  id boolean primary key default true check (id), -- single row
  enforce_free_tier_limits boolean not null default false
);
insert into public.platform_settings (id) values (true) on conflict do nothing;
alter table public.platform_settings enable row level security;
create policy "platform_settings_select" on public.platform_settings for select using (true);
create policy "platform_settings_update_admin" on public.platform_settings for update using (public.is_admin()) with check (public.is_admin());

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
    case when us.id is null then
      case when (select enforce_free_tier_limits from public.platform_settings limit 1) or exists (select 1 from public.subscription_plans p where p.is_active and p.community_limit is not null) then 1 else null end
    else sp.community_limit end,
    case when us.id is null then
      case when (select enforce_free_tier_limits from public.platform_settings limit 1) or exists (select 1 from public.subscription_plans p where p.is_active and p.event_limit is not null) then 3 else null end
    else sp.event_limit end,
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
