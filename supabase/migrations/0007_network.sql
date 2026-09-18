-- Phase 6: Matchmaking / extras — connections, team requests, and the in-app notification
-- feed. Notifications are generated server-side only (triggers below) — clients can never
-- insert a notification for another user, matching the "notifications" RLS design from the
-- rest of this schema. Push *delivery* (FCM) is out of scope here; this is the in-app feed only.

create table public.connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index connections_addressee_idx on public.connections(addressee_id);

alter table public.connections enable row level security;

create policy "connections_select_participant"
  on public.connections for select
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());
create policy "connections_insert_own"
  on public.connections for insert
  with check (requester_id = auth.uid());
create policy "connections_update_addressee"
  on public.connections for update
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());
create policy "connections_delete_participant"
  on public.connections for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create table public.team_requests (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  project text not null,
  excerpt text not null default '',
  roles text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.team_requests enable row level security;

create policy "team_requests_select_all"
  on public.team_requests for select
  using (true);
create policy "team_requests_insert_own"
  on public.team_requests for insert
  with check (poster_id = auth.uid());
create policy "team_requests_update_own"
  on public.team_requests for update
  using (poster_id = auth.uid() or public.is_admin())
  with check (poster_id = auth.uid() or public.is_admin());
create policy "team_requests_delete_own"
  on public.team_requests for delete
  using (poster_id = auth.uid() or public.is_admin());

create table public.team_request_applications (
  team_request_id uuid not null references public.team_requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_request_id, applicant_id)
);

alter table public.team_request_applications enable row level security;

create policy "team_request_applications_select"
  on public.team_request_applications for select
  using (
    applicant_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.team_requests t where t.id = team_request_id and t.poster_id = auth.uid())
  );
create policy "team_request_applications_insert_own"
  on public.team_request_applications for insert
  with check (applicant_id = auth.uid());
create policy "team_request_applications_delete_own"
  on public.team_request_applications for delete
  using (applicant_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  target jsonb not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications_insert_none"
  on public.notifications for insert
  with check (false);
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter publication supabase_realtime add table public.notifications;

create or replace function public.notify_connection_requested()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requester_name text;
begin
  select display_name into requester_name from public.profiles where id = new.requester_id;
  insert into public.notifications (user_id, title, body, target)
  values (new.addressee_id, 'New connection request', coalesce(requester_name, 'Someone') || ' wants to connect.', jsonb_build_object('screen', 'Profile', 'id', new.requester_id));
  return new;
end;
$$;

create trigger connections_after_insert_notify
  after insert on public.connections
  for each row execute function public.notify_connection_requested();

create or replace function public.notify_connection_accepted()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  addressee_name text;
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    select display_name into addressee_name from public.profiles where id = new.addressee_id;
    insert into public.notifications (user_id, title, body, target)
    values (new.requester_id, 'Connection accepted', coalesce(addressee_name, 'Someone') || ' accepted your connection request.', jsonb_build_object('screen', 'Profile', 'id', new.addressee_id));
  end if;
  return new;
end;
$$;

create trigger connections_after_update_notify
  after update on public.connections
  for each row execute function public.notify_connection_accepted();

create or replace function public.notify_team_application()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  poster_id uuid;
  applicant_name text;
  project_name text;
begin
  select poster_id, project into poster_id, project_name from public.team_requests where id = new.team_request_id;
  select display_name into applicant_name from public.profiles where id = new.applicant_id;
  if poster_id is not null then
    insert into public.notifications (user_id, title, body, target)
    values (poster_id, 'New team applicant', coalesce(applicant_name, 'Someone') || ' applied to ' || coalesce(project_name, 'your team request') || '.', jsonb_build_object('screen', 'Network'));
  end if;
  return new;
end;
$$;

create trigger team_request_applications_after_insert_notify
  after insert on public.team_request_applications
  for each row execute function public.notify_team_application();
