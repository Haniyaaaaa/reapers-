-- Admin approval now applies only to Game Developers and Experts; Gamer-only accounts are
-- approved automatically as soon as onboarding completes.
--
-- profiles_enforce_immutable_columns (0001/0012/0027) is a BEFORE UPDATE trigger that reverts any
-- non-admin change to approval_status. Postgres fires same-event triggers alphabetically by name,
-- so this one is named to sort AFTER it and get the last word.
create or replace function public.auto_approve_gamer_profiles()
returns trigger language plpgsql as $$
begin
  if new.onboarded
     and new.approval_status = 'pending'
     and new.roles = array['gamer']::user_role[] then
    new.approval_status := 'approved';
    new.approval_rejection_reason := null;
  end if;
  return new;
end;
$$;

create trigger profiles_z_auto_approve_gamers
  before insert or update on public.profiles
  for each row execute function public.auto_approve_gamer_profiles();

-- Backfill: gamers already stuck on the pending screen.
update public.profiles
set approval_status = 'approved', approval_rejection_reason = null
where onboarded and approval_status = 'pending' and roles = array['gamer']::user_role[];
