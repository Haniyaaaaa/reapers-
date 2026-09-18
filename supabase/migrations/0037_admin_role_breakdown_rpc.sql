-- getDashboardSummary() (src/services/supabase/admin.ts) previously did
-- `supabase.from('profiles').select('roles')` with no limit to compute the "By role" counts
-- on AdminOverviewScreen — pulling every single profile row (and its full roles array) over
-- the wire just to count them client-side. Fine at a handful of users, a full-table scan +
-- transfer once profiles reaches real scale. Replaced with a single aggregate query done in
-- Postgres. Admin-gated the same way as admin_get_user_email (0014_admin_directory.sql) since
-- it's a SECURITY DEFINER function that would otherwise bypass profiles' RLS.
create or replace function public.admin_role_breakdown()
returns table (role text, count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  return query
    select r.role::text, count(*)
    from public.profiles p, unnest(p.roles) as r(role)
    group by r.role;
end;
$$;
