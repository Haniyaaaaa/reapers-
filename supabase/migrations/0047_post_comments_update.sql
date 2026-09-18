-- post_comments got select/insert/delete in 0040_posts_feed.sql but no update policy — comments
-- could be deleted but never edited. Matches demo_comments_update_own's exact shape.
create policy "post_comments_update_own"
  on public.post_comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
