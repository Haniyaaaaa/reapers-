-- enforce_expert_verification_columns (0006_experts.sql, extended in 0043_expert_reviews.sql to
-- also freeze rating/review_count) blocks any UPDATE to those columns unless the caller is
-- service_role or an admin. But recompute_expert_rating() (0043) is a SECURITY DEFINER trigger
-- that runs its own nested UPDATE on experts from within an ordinary reviewer's own session —
-- not literally service_role, and a reviewer is not an admin — so this trigger silently
-- reverted every real rating/review_count update back to its old value. This is the exact same
-- bug class 0027_fix_profile_trigger_sync.sql already fixed for profiles.is_expert/credibility:
-- allow the frozen columns through when pg_trigger_depth() > 0, true only for a nested trigger
-- call (recompute_expert_rating), never for a direct client-issued UPDATE via PostgREST.
create or replace function public.enforce_expert_verification_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_admin() then
    return new;
  end if;
  if pg_trigger_depth() = 0 then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
    new.rating := old.rating;
    new.review_count := old.review_count;
  end if;
  return new;
end;
$$;

-- Backfill: recompute every expert's rating/review_count directly from their real reviews —
-- same reasoning and pattern as 0080_fix_demo_review_backfill.sql's demo backfill. Needs
-- service_role because a plain client-role UPDATE would otherwise hit the very trigger this
-- migration just fixed (depth 0, not a nested call) and get reverted the same way.
set local role service_role;

update public.experts x
set rating = agg.avg_rating,
    review_count = agg.cnt
from (
  select expert_id, count(*) as cnt, coalesce(avg(rating), 0) as avg_rating
  from public.expert_reviews
  group by expert_id
) agg
where x.id = agg.expert_id
  and (x.rating is distinct from agg.avg_rating or x.review_count is distinct from agg.cnt);

update public.experts x
set rating = 0, review_count = 0
where x.review_count > 0
  and not exists (select 1 from public.expert_reviews r where r.expert_id = x.id);

reset role;
