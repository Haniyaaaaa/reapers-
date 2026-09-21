-- Find Teammates filters: "when is this role needed" and onsite / remote / hybrid.
-- (Engine, city (team_requests.location) and role (team_requests.roles) already exist.)
alter table public.team_requests
  add column needed_by date,
  add column work_mode text;

alter table public.team_requests
  add constraint team_requests_work_mode_values check (work_mode is null or work_mode in ('onsite', 'remote', 'hybrid'));

create index team_requests_needed_by_idx on public.team_requests(needed_by);
