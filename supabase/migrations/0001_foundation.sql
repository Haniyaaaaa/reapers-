-- Phase 1: Foundation — identity/profiles schema, RLS, and the auth.users bridge trigger.
-- See /Users/meticuloustech/.claude/plans/deeply-analyz-ethe-prject-flickering-cray.md for the full
-- multi-phase architecture this migration is the first slice of.

create extension if not exists pgcrypto;

create type user_role as enum ('gamer', 'developer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_uri text,
  avatar_id text,
  avatar_look jsonb,
  roles user_role[] not null default '{}',
  skills text[] not null default '{}',
  games text[] not null default '{}',
  tags text[] not null default '{}',
  portfolio_url text,
  linkedin_url text,
  location text,
  credibility numeric not null default 0,
  followers_count int not null default 0,
  following_count int not null default 0,
  posts_count int not null default 0,
  is_expert boolean not null default false,
  is_admin boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles using btree (lower(username));
create index profiles_roles_idx on public.profiles using gin (roles);
create index profiles_skills_idx on public.profiles using gin (skills);

alter table public.profiles enable row level security;

-- Helper functions used across this and future migrations' RLS policies.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Auto-create a stub profile row the moment a user signs up, before onboarding completes.
-- Username is seeded from the email local-part + a short suffix to satisfy the unique
-- constraint even for near-identical emails; the user overwrites it during onboarding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9._-]', '', 'g'));
  if base_username = '' then
    base_username := 'player';
  end if;
  candidate := base_username;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, initcap(base_username));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent clients from writing to system-computed / privileged columns.
-- Row-level RLS (below) covers *whether* a user may update *their own* row;
-- this trigger additionally guards *which columns* they may change on it.
create or replace function public.enforce_profile_immutable_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' then
    new.updated_at := now();
    return new;
  end if;
  new.credibility := old.credibility;
  new.is_admin := old.is_admin;
  new.is_expert := old.is_expert;
  new.followers_count := old.followers_count;
  new.following_count := old.following_count;
  new.posts_count := old.posts_count;
  new.id := old.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_enforce_immutable_columns
  before update on public.profiles
  for each row execute function public.enforce_profile_immutable_columns();

-- RLS: profile directory is publicly readable (matches ProfileScreen/PersonCard browsing);
-- only the owning user may update their own row; no client insert/delete (insert happens
-- only via handle_new_user, delete cascades from auth.users deletion).
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
