-- Demo videos were capped at 60s by demos_duration_range (0022_demo_discovery.sql), with no
-- trim tool anywhere in the app to shorten a longer clip first — a build video over a minute
-- simply failed at the final DB insert after the video/thumbnail/screenshots had already
-- uploaded. Raising the cap to 120s so up-to-2-minute gameplay clips upload without needing
-- to be trimmed down first.
alter table public.demos drop constraint demos_duration_range;
alter table public.demos add constraint demos_duration_range check (duration_sec between 30 and 120);
