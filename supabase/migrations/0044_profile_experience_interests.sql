-- Adds two profile fields the Profile screen previously showed as hardcoded mock text
-- ("6 yrs experience", and an "Interests" tag row) with nothing backing them.
alter table public.profiles
  add column years_experience smallint,
  add column interests text[] not null default '{}';

alter table public.profiles
  add constraint profiles_years_experience_range
  check (years_experience is null or (years_experience >= 0 and years_experience <= 60));
