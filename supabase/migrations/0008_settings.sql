-- Phase 7: Settings — real notification prefs / discoverability / blocked users, replacing
-- the fully-decorative local-only Zustand state that used to back SettingsScreen.tsx.

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_chat boolean not null default true,
  notify_events boolean not null default true,
  notify_demos boolean not null default false,
  notify_bookings boolean not null default true,
  discoverable boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (user_id = auth.uid());
create policy "user_settings_update_own"
  on public.user_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A settings row always exists from signup, same pattern as handle_new_user's profiles stub.
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_settings (user_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute function public.handle_new_user_settings();

create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocked_users_blocked_idx on public.blocked_users(blocked_id);

alter table public.blocked_users enable row level security;

-- Select is blocker-only in both directions: a blocked user must never learn they've been
-- blocked, so there is no policy exposing rows where blocked_id = auth.uid().
create policy "blocked_users_select_own"
  on public.blocked_users for select
  using (blocker_id = auth.uid());
create policy "blocked_users_insert_own"
  on public.blocked_users for insert
  with check (blocker_id = auth.uid());
create policy "blocked_users_delete_own"
  on public.blocked_users for delete
  using (blocker_id = auth.uid());

create or replace function public.is_blocked_either_way(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Network browsing needs to exclude non-discoverable profiles AND filter blocking in BOTH
-- directions — but a regular client query can only ever see blocked_users rows where
-- blocker_id = auth.uid() (by RLS design, so a blocked party can't detect they've been
-- blocked). This security-definer function does the full bidirectional filter server-side
-- without ever exposing raw blocked_users rows to the wrong party.
create or replace function public.list_network_people(viewer_id uuid)
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select p.* from public.profiles p
  join public.user_settings s on s.user_id = p.id
  where p.id <> viewer_id
    and s.discoverable = true
    and not public.is_blocked_either_way(viewer_id, p.id)
$$;
