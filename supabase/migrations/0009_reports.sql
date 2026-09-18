-- Phase 8: Reports — chatroom "Report" was previously a no-op UI button. target_id is
-- deliberately not an FK (it points at a different table depending on target_type) —
-- one polymorphic table for user/message/room/demo/event reports, matching the PDF's
-- single admin "reports queue" concept rather than building four separate tables for v1.

create type report_target as enum ('message', 'room', 'demo', 'event', 'user');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports(status, created_at desc);

alter table public.reports enable row level security;

-- Reporters can submit but never read the queue (not even their own past reports) — matches
-- the "Studio table editor for v1" admin pattern already used for expert verification.
create policy "reports_insert_own"
  on public.reports for insert
  with check (reporter_id = auth.uid());
create policy "reports_select_admin"
  on public.reports for select
  using (public.is_admin());
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());
