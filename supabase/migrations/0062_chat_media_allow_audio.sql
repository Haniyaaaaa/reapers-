-- Chat now supports voice messages (kind = 'voice', already in message_kind since the original
-- schema — this is the first migration to actually populate mediaUrl for one). chat-media's
-- allowed_mime_types (0036_chat_media_storage_hardening.sql) only covered image/video, so a
-- recorded clip's upload would be rejected by the bucket before this could ever work.
update storage.buckets set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/mpeg']
where id = 'chat-media';
