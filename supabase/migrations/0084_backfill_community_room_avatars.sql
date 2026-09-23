-- A community's chatroom (chatrooms.avatar_url) was never given the community's own picture
-- (communities.logo_url) when the room was created — two separate rows that were never kept in
-- sync, so a community with a real uploaded photo showed a generic mascot avatar everywhere its
-- chatroom appeared (the Messages list, chat headers) instead of its own picture. The app now
-- keeps these in sync going forward (see updateRoomAvatarByCommunity, services/supabase/chat.ts);
-- this is a one-time backfill for rooms that were already out of sync.
update public.chatrooms r
set avatar_url = c.logo_url
from public.communities c
where r.community_id = c.id
  and c.logo_url is not null
  and r.avatar_url is distinct from c.logo_url;
