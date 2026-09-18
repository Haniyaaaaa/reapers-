-- Phase 2: Demos (core content loop) — demos, demo_reviews, demo_comments, review
-- aggregation trigger, and the demo-videos/demo-thumbnails storage buckets.
--
-- Score scale is 0-5, matching the already-built UI (DemoCard/DemoFeedScreen render a
-- 5-segment bar from these scores) rather than the original spec doc's 0-10 suggestion.

create table public.demos (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  genre text not null,
  description text not null default '',
  thumbnail_url text,
  video_url text,
  duration_sec int not null,
  external_url text,
  review_count int not null default 0,
  score_gameplay numeric not null default 0,
  score_art numeric not null default 0,
  score_concept numeric not null default 0,
  score_polish numeric not null default 0,
  created_at timestamptz not null default now()
);
create index demos_developer_idx on public.demos(developer_id);
create index demos_created_idx on public.demos(created_at desc);
create index demos_genre_idx on public.demos(genre);

alter table public.demos enable row level security;

create policy "demos_select_all"
  on public.demos for select
  using (true);

create policy "demos_insert_own"
  on public.demos for insert
  with check (developer_id = auth.uid());

create policy "demos_update_own"
  on public.demos for update
  using (developer_id = auth.uid() or public.is_admin())
  with check (developer_id = auth.uid() or public.is_admin());

create policy "demos_delete_own"
  on public.demos for delete
  using (developer_id = auth.uid() or public.is_admin());

-- Score/review_count are system-computed by the aggregation trigger below; block direct
-- client writes to them the same way profiles.credibility is guarded.
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
  new.developer_id := old.developer_id;
  return new;
end;
$$;

create trigger demos_enforce_immutable_columns
  before update on public.demos
  for each row execute function public.enforce_demo_immutable_columns();

create table public.demo_reviews (
  id uuid primary key default gen_random_uuid(),
  demo_id uuid not null references public.demos(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  score_gameplay smallint not null check (score_gameplay between 0 and 5),
  score_art smallint not null check (score_art between 0 and 5),
  score_concept smallint not null check (score_concept between 0 and 5),
  score_polish smallint not null check (score_polish between 0 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demo_id, reviewer_id)
);
create index demo_reviews_demo_idx on public.demo_reviews(demo_id);

alter table public.demo_reviews enable row level security;

create policy "demo_reviews_select_all"
  on public.demo_reviews for select
  using (true);

create policy "demo_reviews_insert_own"
  on public.demo_reviews for insert
  with check (
    reviewer_id = auth.uid()
    and reviewer_id <> (select developer_id from public.demos where id = demo_id)
  );

create policy "demo_reviews_update_own"
  on public.demo_reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

create policy "demo_reviews_delete_own"
  on public.demo_reviews for delete
  using (reviewer_id = auth.uid() or public.is_admin());

-- Recompute the parent demo's aggregate scores/review_count, and roll credibility into the
-- developer's profile, whenever a review is added, edited, or removed. Pure DB aggregation —
-- kept in Postgres rather than an Edge Function so it's atomic with the review write itself.
create or replace function public.recompute_demo_scores()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target_demo_id uuid := coalesce(new.demo_id, old.demo_id);
  target_developer_id uuid;
  agg record;
begin
  select
    count(*) as review_count,
    coalesce(avg(score_gameplay), 0) as avg_gameplay,
    coalesce(avg(score_art), 0) as avg_art,
    coalesce(avg(score_concept), 0) as avg_concept,
    coalesce(avg(score_polish), 0) as avg_polish
  into agg
  from public.demo_reviews
  where demo_id = target_demo_id;

  update public.demos
  set review_count = agg.review_count,
      score_gameplay = agg.avg_gameplay,
      score_art = agg.avg_art,
      score_concept = agg.avg_concept,
      score_polish = agg.avg_polish
  where id = target_demo_id
  returning developer_id into target_developer_id;

  if target_developer_id is not null then
    update public.profiles
    set credibility = (
      select coalesce(avg((d.score_gameplay + d.score_art + d.score_concept + d.score_polish) / 4.0), 0)
      from public.demos d
      where d.developer_id = target_developer_id and d.review_count > 0
    )
    where id = target_developer_id;
  end if;

  return null;
end;
$$;

create trigger demo_reviews_recompute_scores
  after insert or update or delete on public.demo_reviews
  for each row execute function public.recompute_demo_scores();

create table public.demo_comments (
  id uuid primary key default gen_random_uuid(),
  demo_id uuid not null references public.demos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  likes_count int not null default 0,
  created_at timestamptz not null default now()
);
create index demo_comments_demo_idx on public.demo_comments(demo_id, created_at desc);

alter table public.demo_comments enable row level security;

create policy "demo_comments_select_all"
  on public.demo_comments for select
  using (true);

create policy "demo_comments_insert_own"
  on public.demo_comments for insert
  with check (user_id = auth.uid());

create policy "demo_comments_update_own"
  on public.demo_comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "demo_comments_delete_own"
  on public.demo_comments for delete
  using (user_id = auth.uid() or public.is_admin());

-- Storage: showcase content is meant to be publicly viewable, so both buckets are
-- public-read; write is restricted to the uploading developer's own folder.
insert into storage.buckets (id, name, public)
values ('demo-videos', 'demo-videos', true), ('demo-thumbnails', 'demo-thumbnails', true)
on conflict (id) do nothing;

create policy "demo_videos_public_read"
  on storage.objects for select
  using (bucket_id = 'demo-videos');
create policy "demo_videos_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'demo-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "demo_videos_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'demo-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "demo_thumbnails_public_read"
  on storage.objects for select
  using (bucket_id = 'demo-thumbnails');
create policy "demo_thumbnails_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'demo-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "demo_thumbnails_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'demo-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);
