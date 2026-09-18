-- Experts directory production-hardening: "Top Rated" genuinely sorts by experts.rating, but
-- that column has zero write path anywhere — a static value an admin sets once at onboarding,
-- never updated by any real session outcome. This adds a real post-session review system that
-- actually feeds it, mirroring demo_reviews -> demos.score_* exactly.
--
-- Also closes a real pre-existing gap found while grounding this: enforce_expert_verification_
-- columns (0006_experts.sql) only freezes verified/verified_at/verified_by — rating itself was
-- never protected, so an expert could self-inflate their own rating via a plain client update.

alter table public.experts add column review_count int not null default 0;

create or replace function public.enforce_expert_verification_columns()
returns trigger
language plpgsql as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.verified := old.verified;
  new.verified_at := old.verified_at;
  new.verified_by := old.verified_by;
  new.rating := old.rating;
  new.review_count := old.review_count;
  return new;
end;
$$;

create table public.expert_reviews (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade unique,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index expert_reviews_expert_idx on public.expert_reviews(expert_id);

alter table public.expert_reviews enable row level security;
create policy "expert_reviews_select_all" on public.expert_reviews for select using (true);

-- Reviewable only by the booking's own requester, and only once the session has actually
-- happened. No completion-marking mechanism exists anywhere in this codebase — bookings never
-- transition to 'completed' — so "already happened" is computed as confirmed + ends_at in the
-- past, not a status value.
create policy "expert_reviews_insert_own" on public.expert_reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.requester_id = auth.uid() and b.status = 'confirmed' and b.ends_at < now()
    )
  );
create policy "expert_reviews_update_own" on public.expert_reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy "expert_reviews_delete_own" on public.expert_reviews for delete
  using (reviewer_id = auth.uid() or public.is_admin());

create trigger expert_reviews_rate_limit before insert on public.expert_reviews
  for each row execute function public.enforce_rate_limit(10, 300, 'reviewer_id');
create index expert_reviews_reviewer_created_idx on public.expert_reviews(reviewer_id, created_at);

-- Mirrors recompute_demo_scores (0003_demos.sql) exactly.
create or replace function public.recompute_expert_rating()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target_expert_id uuid := coalesce(new.expert_id, old.expert_id);
  agg record;
begin
  select count(*) as cnt, coalesce(avg(rating), 0) as avg_rating into agg
  from public.expert_reviews where expert_id = target_expert_id;
  update public.experts set rating = agg.avg_rating, review_count = agg.cnt where id = target_expert_id;
  return null;
end;
$$;
create trigger expert_reviews_recompute after insert or update or delete on public.expert_reviews
  for each row execute function public.recompute_expert_rating();
