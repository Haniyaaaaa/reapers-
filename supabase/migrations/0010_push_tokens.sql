-- Phase 9: Push notification tokens. Client-side registration code and this table are safe
-- to ship regardless of build target — actual push *delivery* additionally needs a Database
-- Webhook (on notifications INSERT) wired to the dispatch-push Edge Function, deployed later
-- by the user against their own Supabase project (supabase/functions/dispatch-push).
-- iOS push specifically also needs the user's own Apple Developer account credentials at
-- `eas build` time — that account step is never performed by this codebase or this plan.

create table public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

-- No select policy for authenticated clients — a token is write-only from the client's
-- perspective; only the service-role dispatch function ever reads them back.
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (user_id = auth.uid());
create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (user_id = auth.uid());
