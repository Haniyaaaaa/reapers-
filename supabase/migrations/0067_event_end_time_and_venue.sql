-- Events get a real end time, and the exact venue is split out of the public `location`:
--   events.location       -> "Nearby town or area", shown to everyone before they RSVP
--   event_venues.venue    -> "Exact venue" (or the join link for online events), only visible to
--                            the host, admins, and people with a confirmed ("going") RSVP.
-- Enforced by RLS on a separate table — a hidden column on events (which is select-all) would
-- still be readable by anyone querying the API directly.
alter table public.events add column ends_at timestamptz;
alter table public.events add constraint events_ends_after_start check (ends_at is null or ends_at > starts_at);

create table public.event_venues (
  event_id uuid primary key references public.events(id) on delete cascade,
  venue text not null
);

alter table public.event_venues enable row level security;

create policy "event_venues_select_confirmed"
  on public.event_venues for select
  using (
    public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
    or exists (
      select 1 from public.event_rsvps r
      where r.event_id = event_venues.event_id and r.user_id = auth.uid() and r.status = 'going'
    )
  );

create policy "event_venues_insert_host"
  on public.event_venues for insert
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

create policy "event_venues_update_host"
  on public.event_venues for update
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

create policy "event_venues_delete_host"
  on public.event_venues for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()) or public.is_admin());
