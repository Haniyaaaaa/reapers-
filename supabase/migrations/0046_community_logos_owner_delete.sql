-- community-logos got public-read + owner-insert in 0004_communities_chat.sql but no delete
-- policy — same gap 0015_storage_hardening.sql already fixed for demo-videos/demo-thumbnails.
-- Needed so deleteCommunity's best-effort deleteObjectByPublicUrl(community-logos, ...) can
-- actually remove the file instead of being silently rejected by RLS.
create policy "community_logos_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'community-logos' and (storage.foldername(name))[1] = auth.uid()::text);
