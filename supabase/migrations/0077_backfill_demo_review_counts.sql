-- Some demos' review_count/score_* had drifted out of sync with the actual demo_reviews rows
-- (e.g. "Salvage Run" showed "No reviews yet" while a real review existed underneath) — the
-- recompute_demo_scores() trigger (0003_demos.sql) only fires on demo_reviews writes, so any
-- rows that predate the trigger, or that were touched outside the normal insert/update/delete
-- path, never got recomputed. This is a one-time backfill: recompute every demo's aggregate
-- straight from its real reviews, then roll the corrected numbers into developer credibility
-- the same way the trigger itself does.

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

-- A demo with zero real reviews left over from a previous bad count.
update public.demos d
set review_count = 0, score_gameplay = 0, score_art = 0, score_concept = 0, score_polish = 0
where d.review_count > 0
  and not exists (select 1 from public.demo_reviews r where r.demo_id = d.id);

update public.profiles p
set credibility = coalesce(sub.avg_score, 0)
from (
  select d.developer_id, avg((d.score_gameplay + d.score_art + d.score_concept + d.score_polish) / 4.0) as avg_score
  from public.demos d
  where d.review_count > 0
  group by d.developer_id
) sub
where p.id = sub.developer_id;
