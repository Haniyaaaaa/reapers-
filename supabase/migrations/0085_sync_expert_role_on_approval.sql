-- profiles.roles was never updated when someone becomes a verified expert — a genuinely
-- admin-approved expert could sit at roles=['gamer'] forever, with only profiles.is_expert
-- (an internal flag most of the UI doesn't surface as a "role") showing anything changed. That
-- looked, from the outside, like an account somehow "became an expert" out of nowhere. Extend
-- the existing is_expert sync trigger (0006_experts.sql) to also add 'expert' into roles —
-- additive (gamer/developer stays), never removed if they stop being verified, matching how a
-- person keeps having been a verified expert even if their status later changes.
create or replace function public.sync_profile_is_expert()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set is_expert = new.verified,
      roles = case
        when new.verified and not ('expert' = any(roles)) then array_append(roles, 'expert'::user_role)
        else roles
      end
  where id = new.id;
  return new;
end;
$$;

-- Backfill: every already-verified expert whose roles never got this because the sync only
-- ever touched is_expert until now.
update public.profiles p
set roles = array_append(p.roles, 'expert'::user_role)
from public.experts e
where e.id = p.id
  and e.verified = true
  and not ('expert' = any(p.roles));
