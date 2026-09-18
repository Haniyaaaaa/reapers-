-- Experts production-readiness: a real rejection reason (was previously indistinguishable
-- from "still pending"), an external meeting link replacing the fake in-app video call
-- ("like a Zoom link provided, not integrated in the system" — user's explicit choice over
-- a real video SDK integration), and notifications for application review + new bookings.
--
-- The meeting link is per-BOOKING, not per-expert-profile — a static profile-wide link
-- doesn't fit "the expert provides a link once someone actually books a session". Reuses the
-- existing unused `video_room_id` column on bookings (confirmed zero reads/writes anywhere in
-- the app) rather than adding a fresh one.

alter table public.experts
  add column if not exists rejection_reason text;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'video_room_id')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'meeting_link') then
    alter table public.bookings rename column video_room_id to meeting_link;
  end if;
end $$;

-- Notify the applicant on approval (nudging them to set availability, the other gap this
-- pass closes) or rejection (with the reason, so BecomeExpertScreen can show it instead of
-- a permanent "in review" message).
create or replace function public.notify_expert_reviewed()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.verified = true and old.verified = false then
    insert into public.notifications (user_id, title, body, target)
    values (
      new.id,
      'Expert application approved',
      'You''re verified — set your availability so people can book you.',
      jsonb_build_object('screen', 'ExpertAvailability')
    );
  elsif new.rejection_reason is not null and new.rejection_reason is distinct from old.rejection_reason and new.verified = false then
    insert into public.notifications (user_id, title, body, target)
    values (
      new.id,
      'Expert application rejected',
      new.rejection_reason,
      jsonb_build_object('screen', 'BecomeExpert')
    );
  end if;
  return new;
end;
$$;
drop trigger if exists experts_notify_reviewed on public.experts;
create trigger experts_notify_reviewed
  after update on public.experts
  for each row execute function public.notify_expert_reviewed();

-- Notify the expert when someone books a session with them. A session-start reminder would
-- need a scheduled job (pg_cron or an external scheduler) rather than a row-level trigger —
-- explicitly out of scope for this pass, flagged rather than silently skipped.
create or replace function public.notify_booking_created()
returns trigger
language plpgsql security definer set search_path = public as $$
declare requester_name text;
begin
  select display_name into requester_name from public.profiles where id = new.requester_id;
  insert into public.notifications (user_id, title, body, target)
  values (
    new.expert_id,
    'New booking',
    coalesce(requester_name, 'Someone') || ' booked a session with you',
    jsonb_build_object('screen', 'MyBookings')
  );
  return new;
end;
$$;
drop trigger if exists bookings_notify_created on public.bookings;
create trigger bookings_notify_created
  after insert on public.bookings
  for each row execute function public.notify_booking_created();
