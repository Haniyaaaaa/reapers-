-- Public profile counters: accepted connections and sessions an expert has already delivered.
-- security definer because RLS on connections/bookings only exposes a user's own rows, but these
-- two numbers are shown on anyone's profile.
create or replace function public.profile_stats(p_user_id uuid)
returns table (connections_count integer, sessions_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.connections c
      where c.status = 'accepted' and (c.requester_id = p_user_id or c.addressee_id = p_user_id)),
    (select count(*)::integer from public.bookings b
      where b.expert_id = p_user_id and b.status in ('confirmed', 'completed') and b.ends_at < now());
$$;

grant execute on function public.profile_stats(uuid) to authenticated;
