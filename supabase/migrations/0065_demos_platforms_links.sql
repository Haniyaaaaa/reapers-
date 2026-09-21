-- Upload-form fields that were collected but never saved (platforms, portfolio, press kit), so
-- the demo edit screen had nothing to load back and couldn't edit "everything entered at upload".
alter table public.demos
  add column platforms text[] not null default '{}',
  add column portfolio_url text,
  add column press_kit_url text;
