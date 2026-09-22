-- ProfileScreen's Communities tile was hardcoded to 0 for anyone other than the viewer
-- themself — never actually fetched for another person's profile. Fold it into profile_stats
-- (0076_profile_stats.sql) so one call returns all three tiles' real numbers for any profile.
-- Postgres can't CREATE OR REPLACE a function whose OUT-parameter row shape changed — the
-- existing two-column return type has to be dropped first.
drop function if exists public.profile_stats(uuid);

create function public.profile_stats(p_user_id uuid)
returns table (connections_count integer, sessions_count integer, communities_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.connections c
      where c.status = 'accepted' and (c.requester_id = p_user_id or c.addressee_id = p_user_id)),
    (select count(*)::integer from public.bookings b
      where b.expert_id = p_user_id and b.status in ('confirmed', 'completed') and b.ends_at < now()),
    (select count(*)::integer from public.community_members m where m.user_id = p_user_id);
$$;

grant execute on function public.profile_stats(uuid) to authenticated;
