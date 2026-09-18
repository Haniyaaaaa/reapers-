-- Phase 4: Events (RSVP). Per the approved plan, paid events store no raw bank details —
-- only a free-text payout_contact_note the host can show attendees. Real payment processing
-- (Stripe Connect or similar) is out of scope; event_rsvps.paid_by_user is an intent flag
-- only, never a real transaction record.

create type event_type as enum ('Online', 'Physical');
create type rsvp_status as enum ('going', 'interested', 'not_going');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  type event_type not null,
  category text,
  starts_at timestamptz not null,
  location text not null default '',
  cover_url text,
  attendee_count int not null default 0,
  paid boolean not null default false,
  price numeric,
  currency text default 'USD',
  payout_contact_note text,
  created_at timestamptz not null default now()
);
create index events_starts_idx on public.events(starts_at);
create index events_type_idx on public.events(type);
create index events_host_idx on public.events(host_id);

alter table public.events enable row level security;

create policy "events_select_all"
  on public.events for select
  using (true);
create policy "events_insert_own"
  on public.events for insert
  with check (host_id = auth.uid());
create policy "events_update_own"
  on public.events for update
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());
create policy "events_delete_own"
  on public.events for delete
  using (host_id = auth.uid() or public.is_admin());

create or replace function public.enforce_event_immutable_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;
  new.attendee_count := old.attendee_count;
  new.host_id := old.host_id;
  return new;
end;
$$;

create trigger events_enforce_immutable_columns
  before update on public.events
  for each row execute function public.enforce_event_immutable_columns();

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status rsvp_status not null,
  paid_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_idx on public.event_rsvps(user_id);

alter table public.event_rsvps enable row level security;

-- Individual RSVP status is more sensitive than the aggregate count (events.attendee_count
-- is public) — only the RSVP'd user and the host/admin can see who specifically is going.
create policy "event_rsvps_select_own_or_host"
  on public.event_rsvps for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );
create policy "event_rsvps_insert_own"
  on public.event_rsvps for insert
  with check (user_id = auth.uid());
create policy "event_rsvps_update_own"
  on public.event_rsvps for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "event_rsvps_delete_own"
  on public.event_rsvps for delete
  using (user_id = auth.uid());

create or replace function public.recompute_event_attendee_count()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target_event_id uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events
  set attendee_count = (select count(*) from public.event_rsvps where event_id = target_event_id and status = 'going')
  where id = target_event_id;
  return null;
end;
$$;

create trigger event_rsvps_recompute_count
  after insert or update or delete on public.event_rsvps
  for each row execute function public.recompute_event_attendee_count();

insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

create policy "event_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'event-covers');
create policy "event_covers_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'event-covers' and (storage.foldername(name))[1] = auth.uid()::text);
