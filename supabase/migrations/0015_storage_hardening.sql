-- Storage hardening: every bucket (0002/0003/0004/0005) was created with no file_size_limit
-- or allowed_mime_types, so any authenticated user could upload an arbitrarily large file of
-- any type into a bucket meant for small images/short video — a real cost/abuse exposure.
-- Also: uploadVideo()/uploadDemoThumbnail() (src/services/supabase/storage.ts) both upload
-- with `upsert: true`, which needs an UPDATE policy on storage.objects (an upsert onto an
-- existing path is an update at the storage layer) — demo-videos/demo-thumbnails never got
-- one. Harmless today (DemoUploadScreen always generates a fresh Date.now()-based key, so no
-- upload ever actually collides with an existing path) but would fail RLS silently the
-- moment a "replace video" edit flow exists.

update storage.buckets set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('avatars', 'demo-thumbnails', 'community-logos', 'event-covers');

update storage.buckets set
  file_size_limit = 209715200, -- 200 MB
  allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm']
where id = 'demo-videos';

create policy "demo_videos_owner_update"
  on storage.objects for update
  using (bucket_id = 'demo-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'demo-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "demo_thumbnails_owner_update"
  on storage.objects for update
  using (bucket_id = 'demo-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'demo-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);
