-- Event production-readiness: optional RSVP capacity, and notifying 'going' attendees when
-- the host changes the date/location/title or deletes the event outright.

alter table public.events add column max_attendees int; -- null = unlimited

create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql as $$
declare
  cap int;
  going_count int;
begin
  if new.status <> 'going' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'going' then
    return new; -- already counted, e.g. paid_by_user flag flipping
  end if;
  select max_attendees into cap from public.events where id = new.event_id;
  if cap is null then
    return new;
  end if;
  select count(*) into going_count from public.event_rsvps where event_id = new.event_id and status = 'going';
  if going_count >= cap then
    raise exception 'This event is full.' using errcode = '55008';
  end if;
  return new;
end;
$$;
create trigger event_rsvps_enforce_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_event_capacity();

-- Notify every 'going' attendee (not the host) when the host edits the date, location, or
-- title — same notifications-table pattern as notify_support_reply (0012_onboarding_addendum.sql).
create or replace function public.notify_event_updated()
returns trigger
language plpgsql security definer set search_path = public as $$
declare attendee record;
begin
  if new.starts_at is distinct from old.starts_at
     or new.location is distinct from old.location
     or new.title is distinct from old.title then
    for attendee in
      select user_id from public.event_rsvps where event_id = new.id and status = 'going' and user_id <> new.host_id
    loop
      insert into public.notifications (user_id, title, body, target)
      values (attendee.user_id, 'Event updated', new.title || ' changed — check the details', jsonb_build_object('screen', 'EventDetail', 'id', new.id));
    end loop;
  end if;
  return new;
end;
$$;
create trigger events_notify_updated
  after update on public.events
  for each row execute function public.notify_event_updated();

-- Fires before the cascade delete removes event_rsvps, so attendees can still be read.
create or replace function public.notify_event_deleted()
returns trigger
language plpgsql security definer set search_path = public as $$
declare attendee record;
begin
  for attendee in
    select user_id from public.event_rsvps where event_id = old.id and status = 'going' and user_id <> old.host_id
  loop
    insert into public.notifications (user_id, title, body, target)
    values (attendee.user_id, 'Event cancelled', old.title || ' was cancelled by the host', jsonb_build_object('screen', 'EventHub'));
  end loop;
  return old;
end;
$$;
create trigger events_notify_deleted
  before delete on public.events
  for each row execute function public.notify_event_deleted();
