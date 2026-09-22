-- 0077's backfill silently did nothing: demos.review_count/score_* are guarded by
-- enforce_demo_immutable_columns (0003_demos.sql), a BEFORE UPDATE trigger that resets those
-- columns back to their old value unless the session role is 'service_role' — exactly the
-- protection meant to stop a client from self-inflating their own demo's numbers. Run through
-- the SQL editor (session role 'postgres'), 0077's plain UPDATE got silently reverted by that
-- same trigger in the same transaction. This redoes it as service_role so it actually sticks.

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

update public.profiles p
set credibility = coalesce(sub.avg_score, 0)
from (
  select d.developer_id, avg((d.score_gameplay + d.score_art + d.score_concept + d.score_polish) / 4.0) as avg_score
  from public.demos d
  where d.review_count > 0
  group by d.developer_id
) sub
where p.id = sub.developer_id;
