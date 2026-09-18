-- Manual bank-transfer + proof-of-payment + host-approval flow for paid events. Deliberately
-- NOT a payment integration — Reapers never touches, holds, or moves the ticket money. The
-- host publishes their own bank account(s), the attendee pays them directly outside the app,
-- uploads proof, and the host approves/rejects. See the plan file's "Can event ticket money
-- actually reach the host via PayFast?" addendum for why this shape was chosen instead.

create table public.event_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  bank_name text not null,
  account_title text not null,
  account_number text not null,
  iban text,
  created_at timestamptz not null default now()
);
alter table public.event_payout_accounts enable row level security;
create policy "event_payout_accounts_select" on public.event_payout_accounts for select using (true);
create policy "event_payout_accounts_write_host" on public.event_payout_accounts for all
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()) or public.is_admin())
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()) or public.is_admin());

create table public.event_payment_applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  payout_account_id uuid references public.event_payout_accounts(id),
  proof_screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reservation_code text unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (event_id, applicant_id)
);
create index event_payment_applications_event_idx on public.event_payment_applications(event_id, status);
alter table public.event_payment_applications enable row level security;
create policy "event_payment_applications_select" on public.event_payment_applications for select
  using (applicant_id = auth.uid() or public.is_admin() or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));
create policy "event_payment_applications_insert_own" on public.event_payment_applications for insert
  with check (applicant_id = auth.uid());
create policy "event_payment_applications_resubmit_own" on public.event_payment_applications for update
  using (applicant_id = auth.uid() and status = 'rejected')
  with check (applicant_id = auth.uid() and status = 'pending' and reservation_code is null);
create policy "event_payment_applications_review_by_host" on public.event_payment_applications for update
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()) or public.is_admin());

-- Security fix: event_rsvps_insert_own / _update_own (0005_events.sql) currently let ANY
-- user self-write status='going' for ANY event, paid or not — no events.paid check at all.
-- That would let a client bypass this entire application flow for a paid event by inserting
-- directly into event_rsvps. Tighten both so self-write to 'going' is blocked on paid events;
-- 'going' on a paid event can only be written by the security-definer trigger below.
-- 'interested'/'not_going' stay freely self-writable regardless of paid status.
drop policy "event_rsvps_insert_own" on public.event_rsvps;
create policy "event_rsvps_insert_own" on public.event_rsvps for insert
  with check (
    user_id = auth.uid()
    and (status <> 'going' or not exists (select 1 from public.events e where e.id = event_id and e.paid))
  );
drop policy "event_rsvps_update_own" on public.event_rsvps;
create policy "event_rsvps_update_own" on public.event_rsvps for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (status <> 'going' or not exists (select 1 from public.events e where e.id = event_id and e.paid))
  );

-- On approval: generate a collision-safe reservation code and create the actual RSVP row
-- (reuses the existing event_rsvps + attendee_count trigger machinery from 0005_events.sql).
-- Runs as security definer, so it bypasses the tightened insert policy above by design, same
-- as every other membership-granting trigger in this app.
create or replace function public.on_event_application_approved()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  candidate text;
  attempt int := 0;
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
    insert into public.event_rsvps (event_id, user_id, status, paid_by_user)
      values (new.event_id, new.applicant_id, 'going', true)
      on conflict (event_id, user_id) do update set status = 'going', paid_by_user = true;
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
create trigger event_payment_applications_before_update
  before update on public.event_payment_applications
  for each row execute function public.on_event_application_approved();

create or replace function public.notify_event_application_submitted()
returns trigger
language plpgsql security definer set search_path = public as $$
declare host_id uuid; event_title text;
begin
  select e.host_id, e.title into host_id, event_title from public.events e where e.id = new.event_id;
  insert into public.notifications (user_id, title, body, target)
  values (host_id, 'New payment application', 'Someone applied to ' || coalesce(event_title, 'your event'), jsonb_build_object('screen', 'EventApplications', 'id', new.event_id));
  return new;
end;
$$;
create trigger event_payment_applications_notify_submitted
  after insert on public.event_payment_applications
  for each row execute function public.notify_event_application_submitted();

create or replace function public.notify_event_application_reviewed()
returns trigger
language plpgsql security definer set search_path = public as $$
declare event_title text;
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    select title into event_title from public.events where id = new.event_id;
    insert into public.notifications (user_id, title, body, target)
    values (
      new.applicant_id,
      case when new.status = 'approved' then 'Application approved' else 'Application rejected' end,
      coalesce(event_title, 'Event') || (case when new.status = 'approved' then ': you''re confirmed' else ': ' || coalesce(new.rejection_reason, 'not approved') end),
      jsonb_build_object('screen', 'EventDetail', 'id', new.event_id)
    );
  end if;
  return new;
end;
$$;
create trigger event_payment_applications_notify_reviewed
  after update on public.event_payment_applications
  for each row execute function public.notify_event_application_reviewed();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-payment-proofs', 'event-payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "event_payment_proofs_insert_own" on storage.objects for insert
  with check (bucket_id = 'event-payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "event_payment_proofs_select" on storage.objects for select
  using (
    bucket_id = 'event-payment-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (select 1 from public.events e where e.id = ((storage.foldername(name))[2])::uuid and e.host_id = auth.uid())
    )
  );
create policy "event_payment_proofs_delete_own" on storage.objects for delete
  using (bucket_id = 'event-payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Event deletion should notify pending applicants too, not just confirmed 'going' attendees
-- (0023_events_production.sql's notify_event_deleted only covers event_rsvps) — someone who
-- already sent money and is awaiting review deserves to hear the event was cancelled.
create or replace function public.notify_pending_applicants_on_event_deleted()
returns trigger
language plpgsql security definer set search_path = public as $$
declare applicant record;
begin
  for applicant in
    select applicant_id from public.event_payment_applications where event_id = old.id and status = 'pending'
  loop
    insert into public.notifications (user_id, title, body, target)
    values (applicant.applicant_id, 'Event cancelled', old.title || ' was cancelled before your application was reviewed', jsonb_build_object('screen', 'EventHub'));
  end loop;
  return old;
end;
$$;
create trigger events_notify_pending_applicants_deleted
  before delete on public.events
  for each row execute function public.notify_pending_applicants_on_event_deleted();
