-- DemoDetailScreen production-hardening: the redesigned screen fabricated several numbers
-- around the real demo_reviews/demo_comments systems (fake play count, fake screenshots, fake
-- rating/review-count fallbacks). This makes play count and screenshots real features, adds
-- real bookmarks and review voting, and closes a rate-limit gap on demo_reviews that
-- demo_comments already had.

-- 1. Play count — protected the same way review_count/score_* already are: frozen against
-- direct client writes (owner included, to stop self-inflation), the only sanctioned writer is
-- the security-definer RPC below.
alter table public.demos add column play_count int not null default 0;

create or replace function public.enforce_demo_immutable_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;
  new.review_count := old.review_count;
  new.score_gameplay := old.score_gameplay;
  new.score_art := old.score_art;
  new.score_concept := old.score_concept;
  new.score_polish := old.score_polish;
  new.play_count := old.play_count;
  new.developer_id := old.developer_id;
  return new;
end;
$$;

create or replace function public.increment_demo_play_count(target_demo_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.demos set play_count = play_count + 1 where id = target_demo_id;
end;
$$;
grant execute on function public.increment_demo_play_count(uuid) to authenticated;

-- 2. Screenshots — a plain owner-writable column (not immutable-frozen, same as title/
-- description), plus its own bucket following the per-feature-bucket convention already used
-- by demo-videos/demo-thumbnails.
alter table public.demos add column screenshot_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('demo-screenshots', 'demo-screenshots', true)
on conflict (id) do nothing;

create policy "demo_screenshots_public_read"
  on storage.objects for select
  using (bucket_id = 'demo-screenshots');
create policy "demo_screenshots_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'demo-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "demo_screenshots_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'demo-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. demo_reviews rate-limit gap fix — demo_comments already got this in 0018_rate_limiting.sql,
-- demo_reviews never did. Looser window than comments since a legitimate reviewer may
-- reasonably edit their review a few times while composing it (it's an upsert).
create trigger demo_reviews_rate_limit
  before insert on public.demo_reviews
  for each row execute function public.enforce_rate_limit(10, 300, 'reviewer_id');
create index demo_reviews_reviewer_created_idx on public.demo_reviews(reviewer_id, created_at);

-- 4. Bookmarks — mirrors message_stars' exact shape (0004_communities_chat.sql).
create table public.demo_bookmarks (
  demo_id uuid not null references public.demos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (demo_id, user_id)
);
alter table public.demo_bookmarks enable row level security;
create policy "demo_bookmarks_select_own"
  on public.demo_bookmarks for select
  using (user_id = auth.uid());
create policy "demo_bookmarks_insert_own"
  on public.demo_bookmarks for insert
  with check (user_id = auth.uid());
create policy "demo_bookmarks_delete_own"
  on public.demo_bookmarks for delete
  using (user_id = auth.uid());
create trigger demo_bookmarks_rate_limit
  before insert on public.demo_bookmarks
  for each row execute function public.enforce_rate_limit(30, 60, 'user_id');
create index demo_bookmarks_user_created_idx on public.demo_bookmarks(user_id, created_at);

-- 5. Review voting — a vote table plus aggregate columns on demo_reviews, mirroring
-- recompute_demo_scores' aggregation-trigger pattern exactly. A voter can change their vote
-- (update on the same PK) but can't vote on their own review, mirroring demo_reviews'
-- reviewer-can't-review-own-demo exclusion for the analogous reason.
alter table public.demo_reviews add column upvotes int not null default 0, add column downvotes int not null default 0;

create table public.demo_review_votes (
  review_id uuid not null references public.demo_reviews(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (review_id, voter_id)
);
alter table public.demo_review_votes enable row level security;
create policy "demo_review_votes_select_all"
  on public.demo_review_votes for select
  using (true);
create policy "demo_review_votes_insert_own"
  on public.demo_review_votes for insert
  with check (
    voter_id = auth.uid()
    and voter_id <> (select reviewer_id from public.demo_reviews where id = review_id)
  );
create policy "demo_review_votes_update_own"
  on public.demo_review_votes for update
  using (voter_id = auth.uid())
  with check (voter_id = auth.uid());
create policy "demo_review_votes_delete_own"
  on public.demo_review_votes for delete
  using (voter_id = auth.uid());
create trigger demo_review_votes_rate_limit
  before insert on public.demo_review_votes
  for each row execute function public.enforce_rate_limit(30, 60, 'voter_id');
create index demo_review_votes_voter_created_idx on public.demo_review_votes(voter_id, created_at);

create or replace function public.recompute_review_votes()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target_review_id uuid := coalesce(new.review_id, old.review_id);
begin
  update public.demo_reviews r set
    upvotes = (select count(*) from public.demo_review_votes where review_id = target_review_id and vote = 1),
    downvotes = (select count(*) from public.demo_review_votes where review_id = target_review_id and vote = -1)
  where r.id = target_review_id;
  return null;
end;
$$;

create trigger demo_review_votes_recompute
  after insert or update or delete on public.demo_review_votes
  for each row execute function public.recompute_review_votes();
