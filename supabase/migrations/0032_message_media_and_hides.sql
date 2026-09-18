-- Photo/video message support (media_url/media_thumbnail_url) and per-user "delete for me"
-- (message_hides), plus the storage bucket uploaded media lives in.

alter table public.chatroom_messages
  add column media_url text,
  add column media_thumbnail_url text;

alter table public.chatroom_messages
  add constraint chatroom_messages_media_url_length check (media_url is null or char_length(media_url) <= 2048),
  add constraint chatroom_messages_media_thumbnail_url_length check (media_thumbnail_url is null or char_length(media_thumbnail_url) <= 2048);

-- Extend the sender-only column lockdown (0004_communities_chat.sql) to cover the new media
-- columns the same way gif_uri/voice_url already are.
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
    new.media_url := old.media_url;
    new.media_thumbnail_url := old.media_thumbnail_url;
  end if;
  new.sender_id := old.sender_id;
  new.chatroom_id := old.chatroom_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- Per-user "delete for me": hides a message from this user's own view without touching the
-- shared row (mirrors message_stars' shape/RLS exactly — self-only rows, no room-membership
-- check needed since a user can only ever reference messages they can already see).
create table public.message_hides (
  message_id uuid not null references public.chatroom_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_hides enable row level security;

create policy "message_hides_select_self"
  on public.message_hides for select
  using (user_id = auth.uid());
create policy "message_hides_insert_self"
  on public.message_hides for insert
  with check (user_id = auth.uid());
create policy "message_hides_delete_self"
  on public.message_hides for delete
  using (user_id = auth.uid());

create trigger message_hides_rate_limit
  before insert on public.message_hides
  for each row execute function public.enforce_rate_limit(60, 60, 'user_id');
create index message_hides_user_created_idx on public.message_hides(user_id, hidden_at);

-- Storage: shared photo/video uploads. Public-read (same as avatars/community-logos), write
-- restricted to the uploader's own folder — room-membership itself is already gated by
-- chatroom_messages_insert_members, this only controls who can upload the underlying file.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

create policy "chat_media_public_read"
  on storage.objects for select
  using (bucket_id = 'chat-media');
create policy "chat_media_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
