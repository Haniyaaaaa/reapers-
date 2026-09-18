-- Room membership: private-room invites (from a member's accepted connections), public-room
-- join requests (gated via a per-room "require approval" toggle), a room-scoped owner/admin
-- role, and a real fix for a pre-existing gap where any authenticated user could self-insert
-- into ANY chatroom_members row (including private rooms) since the old policy never checked
-- chatrooms.is_private at all.

-- Room-level roles. Creator becomes 'owner' automatically; everyone else defaults 'member'.
-- Only 'owner' can promote to 'admin' — no self-promotion, no admin-promotes-admin for v1.
alter table public.chatroom_members add column role text not null default 'member'
  check (role in ('owner', 'admin', 'member'));
update public.chatroom_members cm set role = 'owner'
  from public.chatrooms c where c.id = cm.chatroom_id and c.created_by = cm.user_id;

alter table public.chatrooms add column requires_approval boolean not null default false;
-- Only meaningful when is_private = false — a private room is invite-only by construction
-- (invisible to non-members via chatrooms_select_visible), so this combination is simply
-- unreachable on a private room, not a conflicting state that needs a CHECK constraint.

create or replace function public.is_room_admin(room_id uuid, uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.chatroom_members
    where chatroom_id = room_id and user_id = uid and role in ('owner', 'admin')
  );
$$;

-- Auto-join trigger (0004_communities_chat.sql:176, chatrooms_after_insert_auto_join) needs
-- to set role='owner' for the creator now that the column exists — same function name/
-- signature, exact same guard, only the insert gains `, role`.
create or replace function public.chatrooms_auto_join_creator()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.chatroom_members (chatroom_id, user_id, role) values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- SECURITY FIX: the previous chatroom_members_insert policy's self-insert clause
-- (`user_id = auth.uid()`) never checked chatrooms.is_private/requires_approval — any
-- authenticated user who obtained a private room's UUID could self-insert as a member,
-- bypassing the "invisible" intent of chatrooms_select_visible entirely. Membership is now
-- granted only by: (a) self-insert into a fully open room, (b) the creator's existing
-- direct-add path (unchanged), or (c) the security-definer accept/approve triggers below,
-- which bypass RLS the same way notify_support_reply already does today (its target table,
-- notifications, has an insert policy of `with check (false)` and yet the trigger succeeds —
-- security-definer functions run with the owning role's privileges, not the caller's).
drop policy "chatroom_members_insert" on public.chatroom_members;
create policy "chatroom_members_insert" on public.chatroom_members for insert
  with check (
    (user_id = auth.uid() and exists (
      select 1 from public.chatrooms c
      where c.id = chatroom_id and c.is_private = false and c.requires_approval = false
    ))
    or exists (select 1 from public.chatrooms c where c.id = chatroom_id and c.created_by = auth.uid())
  );

-- New: owner/admin can remove another member (delete was self-only before).
create policy "chatroom_members_delete_by_admin" on public.chatroom_members for delete
  using (public.is_room_admin(chatroom_id, auth.uid()));

-- New: owner can change another member's role (promote/demote admin).
create policy "chatroom_members_update_role_by_owner" on public.chatroom_members for update
  using (exists (select 1 from public.chatrooms c where c.id = chatroom_id and c.created_by = auth.uid()));

create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid not null references public.chatrooms(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (chatroom_id, invitee_id)
);
create index room_invites_invitee_idx on public.room_invites(invitee_id, status);
alter table public.room_invites enable row level security;
create policy "room_invites_select" on public.room_invites for select
  using (invitee_id = auth.uid() or inviter_id = auth.uid() or public.is_room_admin(chatroom_id, auth.uid()) or public.is_admin());
create policy "room_invites_insert_by_admin" on public.room_invites for insert
  with check (inviter_id = auth.uid() and public.is_room_admin(chatroom_id, auth.uid()));
create policy "room_invites_respond_own" on public.room_invites for update
  using (invitee_id = auth.uid()) with check (invitee_id = auth.uid());

create table public.room_join_requests (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid not null references public.chatrooms(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (chatroom_id, requester_id)
);
create index room_join_requests_chatroom_idx on public.room_join_requests(chatroom_id, status);
alter table public.room_join_requests enable row level security;
create policy "room_join_requests_select" on public.room_join_requests for select
  using (requester_id = auth.uid() or public.is_room_admin(chatroom_id, auth.uid()) or public.is_admin());
create policy "room_join_requests_insert_self" on public.room_join_requests for insert
  with check (requester_id = auth.uid());
create policy "room_join_requests_respond_by_admin" on public.room_join_requests for update
  using (public.is_room_admin(chatroom_id, auth.uid()));
create policy "room_join_requests_cancel_own" on public.room_join_requests for delete
  using (requester_id = auth.uid() and status = 'pending');

-- Accept an invite -> real membership.
create or replace function public.on_room_invite_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.chatroom_members (chatroom_id, user_id) values (new.chatroom_id, new.invitee_id)
      on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger room_invites_accepted after update on public.room_invites
  for each row execute function public.on_room_invite_accepted();

-- Approve a join request -> real membership.
create or replace function public.on_join_request_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    insert into public.chatroom_members (chatroom_id, user_id) values (new.chatroom_id, new.requester_id)
      on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger room_join_requests_approved after update on public.room_join_requests
  for each row execute function public.on_join_request_approved();

-- Notifications — same shape as notify_support_reply (0012_onboarding_addendum.sql).
create or replace function public.notify_room_invite()
returns trigger language plpgsql security definer set search_path = public as $$
declare room_name text; inviter_name text;
begin
  select name into room_name from public.chatrooms where id = new.chatroom_id;
  select display_name into inviter_name from public.profiles where id = new.inviter_id;
  insert into public.notifications (user_id, title, body, target)
  values (
    new.invitee_id,
    'Room invite',
    coalesce(inviter_name, 'Someone') || ' invited you to ' || coalesce(room_name, 'a room'),
    jsonb_build_object('screen', 'RoomInvites')
  );
  return new;
end;
$$;
create trigger room_invites_notify after insert on public.room_invites
  for each row execute function public.notify_room_invite();

create or replace function public.notify_join_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare room_name text; admin_row record;
begin
  select name into room_name from public.chatrooms where id = new.chatroom_id;
  for admin_row in
    select user_id from public.chatroom_members where chatroom_id = new.chatroom_id and role in ('owner', 'admin')
  loop
    insert into public.notifications (user_id, title, body, target)
    values (
      admin_row.user_id,
      'Join request',
      'Someone wants to join ' || coalesce(room_name, 'your room'),
      jsonb_build_object('screen', 'RoomJoinRequests', 'id', new.chatroom_id)
    );
  end loop;
  return new;
end;
$$;
create trigger room_join_requests_notify after insert on public.room_join_requests
  for each row execute function public.notify_join_request();

create or replace function public.notify_join_request_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
declare room_name text;
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    select name into room_name from public.chatrooms where id = new.chatroom_id;
    insert into public.notifications (user_id, title, body, target)
    values (
      new.requester_id,
      case when new.status = 'approved' then 'Request approved' else 'Request declined' end,
      coalesce(room_name, 'Room') || (case when new.status = 'approved' then ': you''re in' else ': request declined' end),
      jsonb_build_object('screen', 'ChatDetail', 'id', new.chatroom_id)
    );
  end if;
  return new;
end;
$$;
create trigger room_join_requests_resolved_notify after update on public.room_join_requests
  for each row execute function public.notify_join_request_resolved();
