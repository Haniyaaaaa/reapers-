-- Phase 3: Chat / Community — communities, chatrooms, per-user membership, messages,
-- reactions/receipts/stars, and Realtime publication for live chat.

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  short_name text not null,
  name text not null,
  description text not null default '',
  logo_url text,
  location text,
  member_count int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.communities enable row level security;

create policy "communities_select_all"
  on public.communities for select
  using (true);
create policy "communities_insert_own"
  on public.communities for insert
  with check (created_by = auth.uid());
create policy "communities_update_own"
  on public.communities for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "communities_delete_own"
  on public.communities for delete
  using (created_by = auth.uid() or public.is_admin());

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.community_members enable row level security;

create policy "community_members_select_all"
  on public.community_members for select
  using (true);
create policy "community_members_insert_self"
  on public.community_members for insert
  with check (user_id = auth.uid());
create policy "community_members_delete_self"
  on public.community_members for delete
  using (user_id = auth.uid());

create or replace function public.adjust_community_member_count()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = greatest(0, member_count - 1) where id = old.community_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger community_members_adjust_count
  after insert or delete on public.community_members
  for each row execute function public.adjust_community_member_count();

-- Chatrooms -------------------------------------------------------------

create type chatroom_kind as enum ('room', 'dm', 'server', 'global');

create table public.chatrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null default '',
  description text not null default '',
  kind chatroom_kind not null default 'room',
  server_region text,
  community_id uuid references public.communities(id) on delete set null,
  is_private boolean not null default false,
  avatar_url text,
  member_count int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index chatrooms_community_idx on public.chatrooms(community_id);
create index chatrooms_kind_idx on public.chatrooms(kind);

alter table public.chatrooms enable row level security;

-- Created here (ahead of its own RLS/policies section below) because is_room_member(), a
-- `language sql` function, is validated against the catalog at CREATE FUNCTION time — it
-- must be able to see this table already, unlike a plpgsql function which wouldn't care.
create table public.chatroom_members (
  chatroom_id uuid not null references public.chatrooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  pinned boolean not null default false,
  muted boolean not null default false,
  last_read_at timestamptz not null default now(),
  streak_count int not null default 0,
  last_chat_at timestamptz,
  primary key (chatroom_id, user_id)
);
create index chatroom_members_user_idx on public.chatroom_members(user_id);

create or replace function public.is_room_member(room_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chatroom_members where chatroom_id = room_id and user_id = auth.uid());
$$;

create policy "chatrooms_select_visible"
  on public.chatrooms for select
  using (not is_private or public.is_room_member(id) or public.is_admin());

create policy "chatrooms_insert_own"
  on public.chatrooms for insert
  with check (created_by = auth.uid() and kind <> 'global');

create policy "chatrooms_update_own"
  on public.chatrooms for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "chatrooms_delete_own"
  on public.chatrooms for delete
  using (created_by = auth.uid() or public.is_admin());

alter table public.chatroom_members enable row level security;

create policy "chatroom_members_select_visible"
  on public.chatroom_members for select
  using (public.is_room_member(chatroom_id) or public.is_admin());

-- A user can add themself to a public room, or the room's creator can add anyone (covers
-- private-room invites — v1 has no separate invite flow, the creator adds members directly).
create policy "chatroom_members_insert"
  on public.chatroom_members for insert
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.chatrooms c where c.id = chatroom_id and c.created_by = auth.uid())
  );

create policy "chatroom_members_update_self"
  on public.chatroom_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chatroom_members_delete_self"
  on public.chatroom_members for delete
  using (user_id = auth.uid());

create or replace function public.adjust_chatroom_member_count()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.chatrooms set member_count = member_count + 1 where id = new.chatroom_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.chatrooms set member_count = greatest(0, member_count - 1) where id = old.chatroom_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger chatroom_members_adjust_count
  after insert or delete on public.chatroom_members
  for each row execute function public.adjust_chatroom_member_count();

-- Auto-join the creator into their own room the instant it's created.
create or replace function public.chatrooms_auto_join_creator()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.chatroom_members (chatroom_id, user_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger chatrooms_after_insert_auto_join
  after insert on public.chatrooms
  for each row execute function public.chatrooms_auto_join_creator();

-- Messages ----------------------------------------------------------------

create type message_kind as enum ('text', 'gif', 'voice');

create table public.chatroom_messages (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid not null references public.chatrooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  kind message_kind not null default 'text',
  gif_uri text,
  voice_url text,
  voice_duration_sec int,
  reply_to_id uuid references public.chatroom_messages(id) on delete set null,
  forwarded boolean not null default false,
  edited boolean not null default false,
  deleted boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index chatroom_messages_room_created_idx on public.chatroom_messages(chatroom_id, created_at desc);
create index chatroom_messages_reply_idx on public.chatroom_messages(reply_to_id);

alter table public.chatroom_messages enable row level security;

create policy "chatroom_messages_select_members"
  on public.chatroom_messages for select
  using (public.is_room_member(chatroom_id));

create policy "chatroom_messages_insert_members"
  on public.chatroom_messages for insert
  with check (public.is_room_member(chatroom_id) and sender_id = auth.uid());

-- Any room member may toggle `pinned`; only the sender may change content/edited/deleted.
-- Column-level nuance handled in a trigger since RLS alone is row-, not column-, scoped.
create policy "chatroom_messages_update_members"
  on public.chatroom_messages for update
  using (public.is_room_member(chatroom_id))
  with check (public.is_room_member(chatroom_id));

create or replace function public.enforce_message_update_columns()
returns trigger
language plpgsql as $$
begin
  if new.sender_id <> auth.uid() then
    new.content := old.content;
    new.deleted := old.deleted;
    new.edited := old.edited;
    new.kind := old.kind;
    new.gif_uri := old.gif_uri;
    new.voice_url := old.voice_url;
    new.voice_duration_sec := old.voice_duration_sec;
  end if;
  new.sender_id := old.sender_id;
  new.chatroom_id := old.chatroom_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger chatroom_messages_enforce_update_columns
  before update on public.chatroom_messages
  for each row execute function public.enforce_message_update_columns();

create table public.message_reactions (
  message_id uuid not null references public.chatroom_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "message_reactions_select_members"
  on public.message_reactions for select
  using (public.is_room_member((select chatroom_id from public.chatroom_messages where id = message_id)));
create policy "message_reactions_insert_self"
  on public.message_reactions for insert
  with check (
    user_id = auth.uid()
    and public.is_room_member((select chatroom_id from public.chatroom_messages where id = message_id))
  );
create policy "message_reactions_delete_self"
  on public.message_reactions for delete
  using (user_id = auth.uid());

create table public.message_stars (
  message_id uuid not null references public.chatroom_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (message_id, user_id)
);

alter table public.message_stars enable row level security;

create policy "message_stars_select_self"
  on public.message_stars for select
  using (user_id = auth.uid());
create policy "message_stars_insert_self"
  on public.message_stars for insert
  with check (user_id = auth.uid());
create policy "message_stars_delete_self"
  on public.message_stars for delete
  using (user_id = auth.uid());

-- Realtime: only the tables live chat UI actually needs pushed to it.
alter publication supabase_realtime add table public.chatroom_messages;
alter publication supabase_realtime add table public.message_reactions;

-- Storage: room/server/community icon uploads (CreateRoomScreen). Public-read like the
-- other showcase-ish buckets; write is any authenticated user's own folder — room creation
-- itself is gated by chatrooms_insert_own, this just controls who can upload the image file.
insert into storage.buckets (id, name, public)
values ('community-logos', 'community-logos', true)
on conflict (id) do nothing;

create policy "community_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'community-logos');
create policy "community_logos_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'community-logos' and (storage.foldername(name))[1] = auth.uid()::text);
