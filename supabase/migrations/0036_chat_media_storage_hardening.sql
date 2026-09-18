-- chat-media (0032_message_media_and_hides.sql) was created after the storage-hardening pass
-- (0015_storage_hardening.sql) and was missed — it's the only bucket left with no
-- file_size_limit/allowed_mime_types, so today any authenticated user can upload an
-- arbitrarily large file of any type via uploadChatImage/uploadChatVideo
-- (src/services/supabase/storage.ts). It holds both images and short videos (one bucket for
-- both message-attachment kinds), so the limit covers the video case and the allowed types
-- union what avatars/demo-thumbnails and demo-videos each allow individually.
update storage.buckets set
  file_size_limit = 104857600, -- 100 MB — chat clips are casual, not full demo uploads
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'chat-media';
