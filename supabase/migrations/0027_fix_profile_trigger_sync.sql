-- Real bug found live via direct REST query: enforce_profile_immutable_columns (0001/0012)
-- unconditionally strips is_admin/is_expert/credibility/follower counts back to their old
-- value on EVERY update unless current_setting('role') = 'service_role'. But the trusted
-- internal triggers that are supposed to maintain these columns -- sync_profile_is_expert()
-- (0006_experts.sql, fires when an admin approves an expert) and recompute_demo_scores()
-- (0003_demos.sql, fires when a demo review is submitted) -- are SECURITY DEFINER functions
-- that run their own nested UPDATE on profiles from within the *caller's own session* (an
-- admin's or reviewer's authenticated role, not literally 'service_role'). SECURITY DEFINER
-- changes the effective privilege/ownership context for permission checks, not
-- current_setting('role') -- so enforce_profile_immutable_columns fires for that nested
-- UPDATE too, sees a non-service_role caller, and silently reverts is_expert/credibility right
-- back to their old value. Net effect: an admin approving an expert application, or a reviewer
-- scoring a demo, has never actually updated profiles.is_expert/credibility in production --
-- confirmed live: experts.verified = true for an approved applicant, but profiles.is_expert
-- was still false.
--
-- Fix: also allow these columns through when pg_trigger_depth() > 0 -- true only when this
-- UPDATE was fired from within another trigger (i.e. one of the two trusted internal paths
-- above), never true for a direct client-issued UPDATE via PostgREST, which always executes at
-- trigger depth 0. This closes the gap without weakening the boundary against direct client
-- writes to these columns.
create or replace function public.enforce_profile_immutable_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' then
    new.updated_at := now();
    return new;
  end if;
  if pg_trigger_depth() = 0 then
    new.is_admin := old.is_admin;
    new.is_expert := old.is_expert;
    new.credibility := old.credibility;
    new.followers_count := old.followers_count;
    new.following_count := old.following_count;
    new.posts_count := old.posts_count;
  end if;
  new.id := old.id;
  if not public.is_admin() then
    -- A rejected user may resubmit (reset their own status back to pending, per the
    -- spec's stated assumption); any other client-side change to these two columns is
    -- rejected -- only an admin can move an account to 'approved'/'rejected'.
    if old.approval_status = 'rejected' and new.approval_status = 'pending' then
      new.approval_rejection_reason := null;
    else
      new.approval_status := old.approval_status;
      new.approval_rejection_reason := old.approval_rejection_reason;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Backfill: every already-verified expert whose profile never actually got synced because of
-- the bug above.
update public.profiles p
set is_expert = true
from public.experts e
where e.id = p.id and e.verified = true and p.is_expert = false;

-- Backfill: recompute credibility for every developer with at least one reviewed demo, using
-- the exact same formula recompute_demo_scores() already uses -- past review submissions had
-- their credibility roll-up silently reverted by the same bug.
update public.profiles p
set credibility = sub.avg_score
from (
  select d.developer_id, avg((d.score_gameplay + d.score_art + d.score_concept + d.score_polish) / 4.0) as avg_score
  from public.demos d
  where d.review_count > 0
  group by d.developer_id
) sub
where sub.developer_id = p.id;
