-- The real, permanent bug behind "no reviews yet" recurring on demos even after 0077/0080's
-- backfills: enforce_demo_immutable_columns (0003_demos.sql, redefined in
-- 0042_demo_detail_hardening.sql) blocks any UPDATE to review_count/score_*/play_count unless
-- the caller is service_role. But recompute_demo_scores() (0003_demos.sql) is a SECURITY
-- DEFINER trigger that runs its own nested UPDATE on demos from within an ordinary reviewer's
-- own session whenever a real review is submitted — not literally service_role — so this
-- trigger silently reverted every real review's effect on review_count back to its old value.
-- 0077/0080 only ever fixed the *existing* stale numbers; this is the trigger itself, so it was
-- always going to keep happening for every new review going forward until now.
--
-- Same bug class, same fix, as 0027_fix_profile_trigger_sync.sql (profiles) and
-- 0086_fix_expert_rating_trigger.sql (experts): allow the frozen columns through when
-- pg_trigger_depth() > 0 — true only for a nested trigger call (recompute_demo_scores), never
-- for a direct client-issued UPDATE via PostgREST.
create or replace function public.enforce_demo_immutable_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;
  if pg_trigger_depth() = 0 then
    new.review_count := old.review_count;
    new.score_gameplay := old.score_gameplay;
    new.score_art := old.score_art;
    new.score_concept := old.score_concept;
    new.score_polish := old.score_polish;
    new.play_count := old.play_count;
    new.developer_id := old.developer_id;
  end if;
  return new;
end;
$$;

-- Re-recompute every demo's numbers now that the trigger can actually persist them — catches
-- any review submitted between 0080's backfill and this fix, the same way 0080 caught anything
-- from before it.
set local role service_role;

update public.demos d
set review_count = agg.review_count,
    score_gameplay = agg.avg_gameplay,
    score_art = agg.avg_art,
    score_concept = agg.avg_concept,
    score_polish = agg.avg_polish
from (
  select
    demo_id,
    count(*) as review_count,
    avg(score_gameplay) as avg_gameplay,
    avg(score_art) as avg_art,
    avg(score_concept) as avg_concept,
    avg(score_polish) as avg_polish
  from public.demo_reviews
  group by demo_id
) agg
where d.id = agg.demo_id
  and d.review_count is distinct from agg.review_count;

update public.demos d
set review_count = 0, score_gameplay = 0, score_art = 0, score_concept = 0, score_polish = 0
where d.review_count > 0
  and not exists (select 1 from public.demo_reviews r where r.demo_id = d.id);

reset role;
