-- Phase 21: admin panel completion — full user directory, per-user detail, subscriber
-- visibility. No new tables: experts/user_subscriptions/support_tickets RLS already lets
-- an admin read any row (Phase 16), so this is mostly a client-layer build. The one real
-- schema need is a safe way for an admin to see a user's email — `profiles` has a public
-- `select using (true)` policy (needed for the app's own directory browsing), so email can
-- never live there without leaking every user's address to every signed-in user. Instead:
-- an admin-only RPC that reads auth.users directly, checked server-side, called one user at
-- a time from AdminUserDetailScreen — never in a bulk list.

create or replace function public.admin_get_user_email(target_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  result text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  select email into result from auth.users where id = target_id;
  return result;
end;
$$;
