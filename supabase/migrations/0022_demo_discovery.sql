-- Real "Jam Entries" flag (was a string-match heuristic client-side), a generated total-score
-- column so "Top Rated" can be a real DB-side order instead of client-side sort of one page,
-- and server-side backstops for the 30-60s duration / title-length rules that were previously
-- only enforced client-side.

alter table public.demos add column is_jam_entry boolean not null default false;

alter table public.demos
  add column total_score numeric generated always as (score_gameplay + score_art + score_concept + score_polish) stored;

alter table public.demos
  add constraint demos_duration_range check (duration_sec between 30 and 60),
  add constraint demos_title_length check (char_length(title) between 3 and 60);
