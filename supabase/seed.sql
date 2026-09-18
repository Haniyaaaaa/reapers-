-- Local dev seed data — official partner communities + their linked chatrooms and the
-- Reapers global room. Ported from src/data/mock.ts so local UI matches what's already
-- designed. Runs with the service role via `supabase db reset` / `supabase start`, so it
-- bypasses RLS (community/chatroom inserts normally require created_by = auth.uid()).
-- logo_url is left null for these — the client falls back to the bundled CommunityLogos
-- assets by matching short_name (see src/services/supabase/communities.ts).

insert into public.communities (id, short_name, name, description, location, created_by) values
  ('00000000-0000-0000-0000-0000000000c1', 'CEGA', 'Center of Excellence in Gaming & Animation', 'Government-backed hub for game and animation training, labs, and incubation in Pakistan.', 'Lahore, PK', null),
  ('00000000-0000-0000-0000-0000000000c2', 'PGDA', 'Pakistan Game Developer Alliance', 'Independent alliance helping Pakistani developers learn, ship, and represent local talent.', 'Pakistan', null),
  ('00000000-0000-0000-0000-0000000000c3', 'IGDA', 'IGDA Pakistan', 'Local chapter of the International Game Developers Association — meetups, advocacy, and peers.', 'Lahore, PK', null),
  ('00000000-0000-0000-0000-0000000000c4', 'PAKGAMEDEV', 'Pak GameDev', 'Pakistan''s game development community for sharing builds, jobs, and jam crews.', 'Pakistan', null),
  ('00000000-0000-0000-0000-0000000000c5', 'PIGD', 'Pak Indie Game Devs', 'Indie-focused circle for playtests, collabs, and local meetups across Pakistan.', 'Pakistan', null)
on conflict (id) do nothing;

insert into public.chatrooms (id, name, tag, description, kind, community_id, is_private, created_by) values
  ('00000000-0000-0000-0000-00000000000g', 'Reapers', 'Community', 'The global Reapers chatroom — everyone lands here.', 'global', null, false, null),
  ('00000000-0000-0000-0000-0000000000r1', 'CEGA', 'Community', 'Official CEGA chatroom — labs, jams, and training updates.', 'room', '00000000-0000-0000-0000-0000000000c1', false, null),
  ('00000000-0000-0000-0000-0000000000r2', 'PGDA', 'Community', 'Official PGDA chatroom.', 'room', '00000000-0000-0000-0000-0000000000c2', false, null),
  ('00000000-0000-0000-0000-0000000000r3', 'IGDA Pakistan', 'Community', 'Official IGDA Pakistan chatroom.', 'room', '00000000-0000-0000-0000-0000000000c3', false, null),
  ('00000000-0000-0000-0000-0000000000r4', 'Pak GameDev', 'Community', 'Official Pak GameDev chatroom.', 'room', '00000000-0000-0000-0000-0000000000c4', false, null),
  ('00000000-0000-0000-0000-0000000000r5', 'Pak Indie Game Devs', 'Community', 'Official Pak Indie Game Devs chatroom.', 'room', '00000000-0000-0000-0000-0000000000c5', false, null)
on conflict (id) do nothing;
