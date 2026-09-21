-- Registration closure: the host chooses how long before the event starts that new sign-ups stop
-- (0 = registration stays open until the event starts, which is the previous behaviour).
-- Enforced in the database, not just hidden in the UI:
--   * free events: joining ("going") is blocked once closed
--   * paid events: submitting / resubmitting a payment application is blocked once closed
-- A host approving an application that was already submitted before the deadline is NOT blocked —
-- reviewing isn't a new registration — and the host can always join their own event.
alter table public.events
  add column registration_closes_before_minutes int not null default 0
  check (registration_closes_before_minutes between 0 and 20160); -- up to 14 days

create or replace function public.event_registration_open(p_event_id uuid)
returns boolean language sql stable as $$
  select now() < e.starts_at - make_interval(mins => e.registration_closes_before_minutes)
  from public.events e where e.id = p_event_id;
$$;

-- Free-event joins.
create or replace function public.enforce_event_registration_open()
returns trigger language plpgsql security definer set search_path = public as $$
declare host uuid;
begin
  if new.status <> 'going' or new.paid_by_user then return new; end if; -- paid path is gated on the application
  if tg_op = 'UPDATE' and old.status = 'going' then return new; end if; -- already registered
  select host_id into host from public.events where id = new.event_id;
  if new.user_id = host then return new; end if;
  if not public.event_registration_open(new.event_id) then
    raise exception 'Registration for this event has closed.' using errcode = '55009';
  end if;
  return new;
end;
$$;
create trigger event_rsvps_enforce_registration_open
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_event_registration_open();

-- Paid-event applications: same pricing/capacity logic as 0072, plus the closure check.
create or replace function public.price_event_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  plan record;
  ev record;
  plan_count int;
  cap_left int;
begin
  if tg_op = 'UPDATE' and new.status <> 'pending' then return new; end if; -- host review, not a (re)submission
  select id, price, max_attendees, host_id into ev from public.events where id = new.event_id;
  if new.applicant_id <> ev.host_id and not public.event_registration_open(new.event_id) then
    raise exception 'Registration for this event has closed.' using errcode = '55009';
  end if;
  select count(*) into plan_count from public.event_ticket_plans where event_id = new.event_id;
  if plan_count > 0 then
    select * into plan from public.event_ticket_plans where id = new.ticket_plan_id and event_id = new.event_id;
    if not found then raise exception 'Choose a ticket plan for this event.' using errcode = '22023'; end if;
    new.plan_name := plan.name; new.unit_price := plan.price;
  else
    new.ticket_plan_id := null; new.plan_name := 'Standard ticket'; new.unit_price := coalesce(ev.price, 0);
  end if;
  new.total_amount := new.unit_price * new.quantity;
  if ev.max_attendees is not null then
    cap_left := ev.max_attendees - public.event_going_tickets(new.event_id, new.applicant_id);
    if new.quantity > cap_left then
      raise exception 'Only % ticket(s) left for this event.', greatest(cap_left, 0) using errcode = '55008';
    end if;
  end if;
  return new;
end;
$$;
