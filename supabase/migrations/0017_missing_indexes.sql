-- Phase 22 hardening: three composite-PK tables are queried on their non-leading PK column
-- with no supplemental index (the fix pattern already exists elsewhere, e.g.
-- chatroom_members_user_idx in 0004) — without these, each query is a sequential scan.

create index community_members_user_idx on public.community_members(user_id);
create index team_request_applications_applicant_idx on public.team_request_applications(applicant_id);
create index message_stars_user_idx on public.message_stars(user_id);
