-- Real gap found live: chatroom_messages had no length/size bound at all -- a client could
-- insert an arbitrarily large content string, gif_uri, or voice_duration_sec. Limits chosen
-- generously (matching this app's existing "abuse backstop, not a UX throttle" philosophy from
-- 0018_rate_limiting.sql): 2000 chars is well beyond any legitimate chat message, 2048 matches
-- a practical URL-length ceiling, 300s (5 min) is far past any real voice note.
alter table public.chatroom_messages
  add constraint chatroom_messages_content_length check (char_length(content) <= 2000),
  add constraint chatroom_messages_gif_uri_length check (gif_uri is null or char_length(gif_uri) <= 2048),
  add constraint chatroom_messages_voice_duration_range check (voice_duration_sec is null or voice_duration_sec between 0 and 300);

-- Real gap: message_reactions/message_stars were never covered by the Phase 23 rate-limiting
-- pass. message_stars has no created_at column yet (enforce_rate_limit needs one, same as
-- every other table it's already attached to) -- add it before attaching the trigger.
alter table public.message_stars add column created_at timestamptz not null default now();

create trigger message_reactions_rate_limit
  before insert on public.message_reactions
  for each row execute function public.enforce_rate_limit(60, 60, 'user_id');
create index message_reactions_user_created_idx on public.message_reactions(user_id, created_at);

create trigger message_stars_rate_limit
  before insert on public.message_stars
  for each row execute function public.enforce_rate_limit(60, 60, 'user_id');
create index message_stars_user_created_idx on public.message_stars(user_id, created_at);
