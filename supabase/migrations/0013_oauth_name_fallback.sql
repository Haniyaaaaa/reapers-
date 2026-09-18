-- Phase 17 follow-up: handle_new_user only looked for the metadata keys SignupScreen sends
-- (first_name/last_name/username/phone), so a Google/Apple sign-in — which populates
-- different keys (given_name/family_name, or a single full_name/name) — got a real
-- email-derived username but blank first_name/last_name. Not a blocker (RootNavigator's
-- onboarding/approval gating is provider-agnostic either way, and the user can still fill
-- in their name during onboarding), but easy to close properly.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
  meta_username text;
  meta_full_name text;
  meta_first text;
  meta_last text;
  resolved_display_name text;
begin
  meta_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-z0-9._-]', '', 'g'));
  if meta_username <> '' then
    base_username := meta_username;
  else
    base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9._-]', '', 'g'));
  end if;
  if base_username = '' then
    base_username := 'player';
  end if;
  candidate := base_username;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  -- Google/Apple (via Supabase's OAuth provider metadata) populate given_name/family_name
  -- and/or a single full_name/name field instead of our own first_name/last_name keys.
  meta_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
  meta_first := coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'given_name', ''),
    nullif(split_part(meta_full_name, ' ', 1), ''),
    ''
  );
  meta_last := coalesce(
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'family_name', ''),
    nullif(trim(regexp_replace(meta_full_name, '^\S+\s*', '')), ''),
    ''
  );
  resolved_display_name := coalesce(nullif(trim(meta_first || ' ' || meta_last), ''), initcap(base_username));

  insert into public.profiles (id, username, display_name, first_name, last_name, phone)
  values (new.id, candidate, resolved_display_name, meta_first, meta_last, nullif(new.raw_user_meta_data ->> 'phone', ''));
  return new;
end;
$$;
