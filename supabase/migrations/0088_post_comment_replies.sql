-- Lets a comment target a specific earlier comment ("reply to X") without building a real
-- nested-thread tree — the list stays flat (one query, one flat render pass); a reply just
-- carries a pointer to who it's answering, shown as a small tag above it client-side.
alter table public.post_comments add column parent_id uuid references public.post_comments(id) on delete set null;
create index post_comments_parent_idx on public.post_comments(parent_id);
