-- Team request cards used to show a hardcoded studio line ("ASHFALL STUDIO · STUDIO · 4 PEOPLE"),
-- stage pill ("VERTICAL SLICE"), engine ("Unity"), location ("Remote · UTC+3") and commitment
-- ("~10 HRS/WEEK · REV") for every request — team_requests only stored project/excerpt/roles.
-- These are now real, optional, poster-supplied columns, so the card only shows what was
-- actually provided. Existing rows keep null everywhere and simply render without those lines.
alter table public.team_requests
  add column studio text,
  add column team_size smallint,
  add column stage text,
  add column engine text,
  add column location text,
  add column hours_per_week smallint,
  add column compensation text;

alter table public.team_requests
  add constraint team_requests_studio_length check (studio is null or char_length(studio) <= 60),
  add constraint team_requests_engine_length check (engine is null or char_length(engine) <= 30),
  add constraint team_requests_location_length check (location is null or char_length(location) <= 60),
  add constraint team_requests_team_size_range check (team_size is null or team_size between 1 and 500),
  add constraint team_requests_hours_range check (hours_per_week is null or hours_per_week between 1 and 168),
  add constraint team_requests_stage_values check (stage is null or stage in ('idea', 'prototype', 'vertical_slice', 'production', 'live')),
  add constraint team_requests_compensation_values check (compensation is null or compensation in ('paid', 'revenue_share', 'unpaid'));
