-- Global posts feed — the Home screen's "Share an update with your circle" composer and "What
-- people are saying" section were entirely mocked (fake posts derived from chat rooms' last
-- messages, a fabricated like count, and Photo/Activity/Thought/Comment/Share buttons with no
-- handler at all). This is the real backend: a global (not connections/community-scoped, kept
-- open for a future scoping column), publicly-readable feed with multi-emoji reactions
-- (mirroring message_reactions exactly) and flat comments (mirroring demo_comments, but with
-- real cursor pagination instead of demo_comments' flat 200-row cap, since a public post can
-- plausibly exceed that at real scale).

create type post_kind as enum ('text', 'photo', 'activity');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind post_kind not null default 'text',
  content text not null default '',
  activity_tag text,
  media_url text,
  media_thumbnail_url text,
  -- Soft delete, but only for admin-initiated moderation (see enforce_post_update_columns
  -- below) — an author's own delete is a real row removal (posts_delete_own_or_admin).
  -- Preserving admin removals (rather than hard-deleting) keeps the reports queue auditable,
  -- matching chatroom_messages.deleted's precedent rather than demos' hard-delete one, since
  -- posts are public broadcast content subject to reports.
  deleted boolean not null default false,
  deleted_by uuid references public.profiles(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts(created_at desc);
-- Doubles as the rate-limit trigger's scan index below — do not add a second one.
create index posts_user_created_idx on public.posts(user_id, created_at desc);

alter table public.posts
  add constraint posts_content_length check (char_length(content) <= 2000),
  add constraint posts_activity_tag_length check (activity_tag is null or char_length(activity_tag) <= 60),
  add constraint posts_media_url_length check (media_url is null or char_length(media_url) <= 2048);

alter table public.posts enable row level security;

-- Global read, matching the same `using (true)` idiom demos_select_all/demo_comments_select_all
-- already use for public-read tables in this app — not a new convention.
create policy "posts_select_all"
  on public.posts for select
  using (true);
create policy "posts_insert_own"
  on public.posts for insert
  with check (user_id = auth.uid());
create policy "posts_update_own_or_admin"
  on public.posts for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "posts_delete_own_or_admin"
  on public.posts for delete
  using (user_id = auth.uid() or public.is_admin());

-- Mirrors enforce_message_update_columns (0004_communities_chat.sql) exactly: an admin's only
-- real lever on someone else's post is the deletion columns — content/kind/media can't be
-- silently rewritten out from under the author, and ownership/created_at never change at all.
create or replace function public.enforce_post_update_columns()
returns trigger
language plpgsql as $$
begin
  if new.user_id <> auth.uid() then
    new.content := old.content;
    new.kind := old.kind;
    new.activity_tag := old.activity_tag;
    new.media_url := old.media_url;
    new.media_thumbnail_url := old.media_thumbnail_url;
  end if;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger posts_enforce_update_columns
  before update on public.posts
  for each row execute function public.enforce_post_update_columns();

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

alter table public.post_reactions enable row level security;

-- Select is global (`using (true)`), unlike message_reactions' room-membership gate — posts
-- have no membership concept, the feed itself is public by design.
create policy "post_reactions_select_all"
  on public.post_reactions for select
  using (true);
create policy "post_reactions_insert_self"
  on public.post_reactions for insert
  with check (user_id = auth.uid());
create policy "post_reactions_delete_self"
  on public.post_reactions for delete
  using (user_id = auth.uid());

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index post_comments_post_created_idx on public.post_comments(post_id, created_at desc);
alter table public.post_comments add constraint post_comments_text_length check (char_length(text) <= 1000);

alter table public.post_comments enable row level security;

create policy "post_comments_select_all"
  on public.post_comments for select
  using (true);
create policy "post_comments_insert_own"
  on public.post_comments for insert
  with check (user_id = auth.uid());
create policy "post_comments_delete_own_or_admin"
  on public.post_comments for delete
  using (user_id = auth.uid() or public.is_admin());

-- Rate limiting, reusing enforce_rate_limit(max_count, window_seconds, user_col) from
-- 0018_rate_limiting.sql verbatim. Posts are public broadcast content (more like
-- demo_comments than private chat) so stricter than chatroom_messages' 30/10s.
create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_rate_limit(5, 300, 'user_id'); -- 5 posts / 5 min

create trigger post_comments_rate_limit
  before insert on public.post_comments
  for each row execute function public.enforce_rate_limit(10, 60, 'user_id');
create index post_comments_user_created_idx on public.post_comments(user_id, created_at);

create trigger post_reactions_rate_limit
  before insert on public.post_reactions
  for each row execute function public.enforce_rate_limit(60, 60, 'user_id'); -- same as message_reactions
create index post_reactions_user_created_idx on public.post_reactions(user_id, created_at);

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_reactions;
alter publication supabase_realtime add table public.post_comments;

-- New bucket rather than reusing chat-media: chat-media's RLS/lifecycle assumptions (room-
-- membership visibility, per-message hide semantics from 0032_message_media_and_hides.sql)
-- don't apply to public global posts with their own soft-delete/report lifecycle.
-- Bucket-per-feature is already the dominant pattern (demo-videos, demo-thumbnails,
-- community-logos, avatars are all separate single-purpose buckets).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "post_media_public_read"
  on storage.objects for select
  using (bucket_id = 'post-media');
create policy "post_media_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post_media_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
