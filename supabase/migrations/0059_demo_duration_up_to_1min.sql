-- Demo videos can be any length up to 1 minute (previously 30s–2min).
alter table public.demos drop constraint if exists demos_duration_range;
alter table public.demos add constraint demos_duration_range check (duration_sec between 1 and 60);
