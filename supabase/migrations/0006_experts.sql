-- Phase 5: Expert office hours — application/verification + booking.
--
-- The built UI (ExpertCalendar/utils/expertSlots.ts) generates every 15-min slot for a day
-- client-side rather than having experts publish discrete availability windows, so there's
-- no separate "open slots" catalog to model — bookings themselves are the source of truth,
-- and a `unique (expert_id, starts_at)` constraint is what makes double-booking impossible
-- (two concurrent inserts for the same slot: exactly one succeeds, the other gets a clean
-- 23505 unique-violation the client maps to "that slot was just taken").
-- Video calling stays the existing no-op stub (services/video/callClient.ts) — out of scope.

create table public.experts (
  id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default '',
  company text not null default '',
  bio text not null default '',
  specialties text[] not null default '{}',
  rating numeric not null default 0,
  years_experience int,
  linkedin_url text,
  portfolio_url text,
  work jsonb,
  verified boolean not null default false,
  applied_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id)
);

alter table public.experts enable row level security;

-- Unverified applicants are visible only to themselves/admins — not listed publicly until approved.
create policy "experts_select_verified_or_own"
  on public.experts for select
  using (verified = true or id = auth.uid() or public.is_admin());

create policy "experts_insert_own"
  on public.experts for insert
  with check (id = auth.uid() and verified = false);

create policy "experts_update_own"
  on public.experts for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- verified/verified_at/verified_by are admin-only writable, same immutable-column pattern
-- used for profiles.credibility and demos' aggregate score columns.
create or replace function public.enforce_expert_verification_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.verified := old.verified;
  new.verified_at := old.verified_at;
  new.verified_by := old.verified_by;
  return new;
end;
$$;

create trigger experts_enforce_verification_columns
  before update on public.experts
  for each row execute function public.enforce_expert_verification_columns();

-- Keep profiles.is_expert (used for client-side UX gating, e.g. hiding "Become an Expert")
-- in sync with the real verification state.
create or replace function public.sync_profile_is_expert()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set is_expert = new.verified where id = new.id;
  return new;
end;
$$;

create trigger experts_sync_profile_is_expert
  after insert or update of verified on public.experts
  for each row execute function public.sync_profile_is_expert();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  video_room_id text,
  created_at timestamptz not null default now(),
  unique (expert_id, starts_at)
);
create index bookings_requester_idx on public.bookings(requester_id);
create index bookings_expert_idx on public.bookings(expert_id, starts_at);

alter table public.bookings enable row level security;

create policy "bookings_select_participant"
  on public.bookings for select
  using (requester_id = auth.uid() or expert_id = auth.uid() or public.is_admin());

create policy "bookings_insert_own"
  on public.bookings for insert
  with check (requester_id = auth.uid());

create policy "bookings_update_participant"
  on public.bookings for update
  using (requester_id = auth.uid() or expert_id = auth.uid() or public.is_admin())
  with check (requester_id = auth.uid() or expert_id = auth.uid() or public.is_admin());
