-- Ticket plans: a paid event offers one or more named plans, each with its own price; a buyer
-- picks a plan and a quantity, and the total is computed HERE (never trusted from the client).
-- A buyer holding several tickets is ONE application / ONE RSVP row with quantity = ticket_count,
-- so attendee_count and the capacity limit now count tickets (people), not accounts.

create table public.event_ticket_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price numeric not null check (price > 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index event_ticket_plans_event_idx on public.event_ticket_plans(event_id, sort_order);
alter table public.event_ticket_plans enable row level security;
create policy "event_ticket_plans_select" on public.event_ticket_plans for select using (true);
create policy "event_ticket_plans_write_host" on public.event_ticket_plans for all
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()) or public.is_admin())
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()) or public.is_admin());

alter table public.event_payment_applications
  add column ticket_plan_id uuid references public.event_ticket_plans(id) on delete set null,
  add column plan_name text,
  add column unit_price numeric,
  add column quantity int not null default 1 check (quantity between 1 and 10),
  add column total_amount numeric;

alter table public.event_rsvps
  add column ticket_count int not null default 1 check (ticket_count between 1 and 10);

-- Tickets currently held by confirmed attendees.
create or replace function public.event_going_tickets(p_event_id uuid, p_exclude_user uuid default null)
returns int language sql stable as $$
  select coalesce(sum(ticket_count), 0)::int from public.event_rsvps
  where event_id = p_event_id and status = 'going' and (p_exclude_user is null or user_id <> p_exclude_user);
$$;

-- attendee_count = tickets, not RSVP rows.
create or replace function public.recompute_event_attendee_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_event_id uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events set attendee_count = public.event_going_tickets(target_event_id) where id = target_event_id;
  return null;
end;
$$;

-- Capacity in tickets. (Paid events reach 'going' only through the approval trigger below.)
create or replace function public.enforce_event_capacity()
returns trigger language plpgsql as $$
declare cap int;
begin
  if new.status <> 'going' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'going' and old.ticket_count = new.ticket_count then return new; end if;
  select max_attendees into cap from public.events where id = new.event_id;
  if cap is null then return new; end if;
  if public.event_going_tickets(new.event_id, new.user_id) + new.ticket_count > cap then
    raise exception 'This event is full.' using errcode = '55008';
  end if;
  return new;
end;
$$;

-- Price the application from the chosen plan and reject it up front if there aren't enough spots,
-- so nobody pays for tickets that can't be issued.
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
  select count(*) into plan_count from public.event_ticket_plans where event_id = new.event_id;
  if plan_count > 0 then
    select * into plan from public.event_ticket_plans where id = new.ticket_plan_id and event_id = new.event_id;
    if not found then raise exception 'Choose a ticket plan for this event.' using errcode = '22023'; end if;
    new.plan_name := plan.name; new.unit_price := plan.price;
  else
    -- Events created before plans existed: one implicit "Standard ticket" at the event's price.
    new.ticket_plan_id := null; new.plan_name := 'Standard ticket'; new.unit_price := coalesce((select price from public.events where id = new.event_id), 0);
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
create trigger event_payment_applications_price
  before insert or update of ticket_plan_id, quantity, status on public.event_payment_applications
  for each row execute function public.price_event_application();

-- On approval the buyer's RSVP carries the ticket quantity.
create or replace function public.on_event_application_approved()
returns trigger language plpgsql security definer set search_path = public as $$
declare candidate text; attempt int := 0;
begin
  if new.status = 'approved' and old.status <> 'approved' then
    loop
      candidate := upper(substr(md5(new.id::text || clock_timestamp()::text || attempt::text), 1, 8));
      exit when not exists (select 1 from public.event_payment_applications where reservation_code = candidate);
      attempt := attempt + 1;
      exit when attempt > 5;
    end loop;
    new.reservation_code := candidate;
    new.reviewed_at := now();
    insert into public.event_rsvps (event_id, user_id, status, paid_by_user, ticket_count)
      values (new.event_id, new.applicant_id, 'going', true, new.quantity)
      on conflict (event_id, user_id) do update set status = 'going', paid_by_user = true, ticket_count = new.quantity;
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

-- Tell the host what was bought.
create or replace function public.notify_event_application_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
declare host_id uuid; event_title text;
begin
  select e.host_id, e.title into host_id, event_title from public.events e where e.id = new.event_id;
  insert into public.notifications (user_id, title, body, target)
  values (host_id, 'New payment application',
    'Someone applied for ' || new.quantity || ' × ' || coalesce(new.plan_name, 'ticket') || ' to ' || coalesce(event_title, 'your event'),
    jsonb_build_object('screen', 'EventApplications', 'id', new.event_id));
  return new;
end;
$$;
