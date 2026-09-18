-- Phase 16 (Onboarding & Admin Panel addendum): profiles fields, account approval gating,
-- expert weekday availability, subscription plans (intent-only, no billing integration),
-- and support tickets. See the "Addendum: Onboarding Flow & Admin Panel" section of
-- /Users/meticuloustech/.claude/plans/deeply-analyz-ethe-prject-flickering-cray.md.

-- Profiles: signup fields + account-level approval gating -------------------

alter table public.profiles
  add column first_name text not null default '',
  add column last_name text not null default '',
  add column phone text,
  add column approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column approval_rejection_reason text;

-- Existing rows (seed/dev data, and anyone already onboarded before this migration) must
-- not be retroactively locked out by the new default.
update public.profiles set approval_status = 'approved';

alter type user_role add value if not exists 'expert';

-- Admins may set approval_status/approval_rejection_reason on ANY profile (the approve/reject
-- actions in the new Admin Panel); everyone else keeps only their own row, and only via the
-- fields the immutable-columns trigger below still permits (approval fields excluded for them).
create policy "profiles_update_by_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.enforce_profile_immutable_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' then
    new.updated_at := now();
    return new;
  end if;
  new.is_admin := old.is_admin;
  new.is_expert := old.is_expert;
  new.credibility := old.credibility;
  new.followers_count := old.followers_count;
  new.following_count := old.following_count;
  new.posts_count := old.posts_count;
  new.id := old.id;
  if not public.is_admin() then
    -- A rejected user may resubmit (reset their own status back to pending, per the
    -- spec's stated assumption); any other client-side change to these two columns is
    -- rejected — only an admin can move an account to 'approved'/'rejected'.
    if old.approval_status = 'rejected' and new.approval_status = 'pending' then
      new.approval_rejection_reason := null;
    else
      new.approval_status := old.approval_status;
      new.approval_rejection_reason := old.approval_rejection_reason;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Read first/last/phone/username off signup metadata when present (SignupScreen now sends
-- them via supabase.auth.signUp's options.data); falls back to the original email-derived
-- username so OAuth signups (which never carry this metadata) keep working unchanged.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
  meta_username text;
  meta_first text;
  meta_last text;
  resolved_display_name text;
begin
  meta_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-z0-9._-]', '', 'g'));
  if meta_username <> '' then
    base_username := meta_username;
  else
    base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9._-]', '', 'g'));
  end if;
  if base_username = '' then
    base_username := 'player';
  end if;
  candidate := base_username;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  meta_first := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  meta_last := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  resolved_display_name := coalesce(nullif(trim(meta_first || ' ' || meta_last), ''), initcap(base_username));

  insert into public.profiles (id, username, display_name, first_name, last_name, phone)
  values (new.id, candidate, resolved_display_name, meta_first, meta_last, nullif(new.raw_user_meta_data ->> 'phone', ''));
  return new;
end;
$$;

-- Expert weekday availability -------------------------------------------------

create table public.expert_availability (
  expert_id uuid not null references public.experts(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  primary key (expert_id, weekday)
);

alter table public.expert_availability enable row level security;

create policy "expert_availability_select_visible"
  on public.expert_availability for select
  using (
    exists (select 1 from public.experts e where e.id = expert_id and e.verified = true)
    or expert_id = auth.uid()
    or public.is_admin()
  );
create policy "expert_availability_write_own"
  on public.expert_availability for all
  using (expert_id = auth.uid() or public.is_admin())
  with check (expert_id = auth.uid() or public.is_admin());

create table public.expert_time_slots (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (ends_at > starts_at)
);
create index expert_time_slots_expert_weekday_idx on public.expert_time_slots(expert_id, weekday);

alter table public.expert_time_slots enable row level security;

create policy "expert_time_slots_select_visible"
  on public.expert_time_slots for select
  using (
    exists (select 1 from public.experts e where e.id = expert_id and e.verified = true)
    or expert_id = auth.uid()
    or public.is_admin()
  );
create policy "expert_time_slots_write_own"
  on public.expert_time_slots for all
  using (expert_id = auth.uid() or public.is_admin())
  with check (expert_id = auth.uid() or public.is_admin());

-- Subscriptions (intent-only — no payment processor integration, matches the standing
-- decision to defer real billing, same spirit as event_rsvps.paid_by_user) ------------------

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

create policy "subscription_plans_select_visible"
  on public.subscription_plans for select
  using (is_active or public.is_admin());
create policy "subscription_plans_write_admin"
  on public.subscription_plans for all
  using (public.is_admin())
  with check (public.is_admin());

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  renews_at timestamptz,
  created_at timestamptz not null default now()
);
create index user_subscriptions_user_idx on public.user_subscriptions(user_id);

alter table public.user_subscriptions enable row level security;

create policy "user_subscriptions_select_own"
  on public.user_subscriptions for select
  using (user_id = auth.uid() or public.is_admin());
create policy "user_subscriptions_insert_own"
  on public.user_subscriptions for insert
  with check (user_id = auth.uid());
create policy "user_subscriptions_update_own"
  on public.user_subscriptions for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Support tickets -------------------------------------------------------------

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets(user_id);

alter table public.support_tickets enable row level security;

create policy "support_tickets_select_own"
  on public.support_tickets for select
  using (user_id = auth.uid() or public.is_admin());
create policy "support_tickets_insert_own"
  on public.support_tickets for insert
  with check (user_id = auth.uid());
create policy "support_tickets_update_own_or_admin"
  on public.support_tickets for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);
create index support_ticket_messages_ticket_idx on public.support_ticket_messages(ticket_id, created_at);

alter table public.support_ticket_messages enable row level security;

create or replace function public.can_view_ticket(t_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = t_id and (t.user_id = auth.uid() or public.is_admin())
  );
$$;

create policy "support_ticket_messages_select_visible"
  on public.support_ticket_messages for select
  using (public.can_view_ticket(ticket_id));
create policy "support_ticket_messages_insert_visible"
  on public.support_ticket_messages for insert
  with check (sender_id = auth.uid() and public.can_view_ticket(ticket_id));

-- Notify the ticket owner whenever someone other than themself (i.e. an admin) posts a
-- reply — same trigger-based in-app notification pattern used for chat/events/connections.
create or replace function public.notify_support_reply()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ticket_owner uuid;
begin
  select user_id into ticket_owner from public.support_tickets where id = new.ticket_id;
  if ticket_owner is not null and ticket_owner <> new.sender_id then
    insert into public.notifications (user_id, title, body, target)
    values (
      ticket_owner,
      'Support reply',
      left(new.message, 140),
      jsonb_build_object('screen', 'SupportTicketDetail', 'id', new.ticket_id)
    );
  end if;
  return new;
end;
$$;

create trigger support_ticket_messages_notify
  after insert on public.support_ticket_messages
  for each row execute function public.notify_support_reply();
