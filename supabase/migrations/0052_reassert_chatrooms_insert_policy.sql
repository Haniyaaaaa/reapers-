-- "Start Messaging" and "Create Room" both fail with 42501 ("new row violates row-level
-- security policy for table chatrooms") on a completely fresh login, for a brand-new account,
-- on the very first attempt — the app code passes the correct `created_by = auth.uid()`
-- (verified by reading every insert call site), so the only remaining explanation is that the
-- live database's `chatrooms_insert_own` policy (originally created in
-- 0004_communities_chat.sql) is missing or no longer matches what's in that migration file —
-- RLS enabled with zero matching permissive policies denies every insert by default, which
-- reproduces exactly this symptom for every user, every time. This re-asserts the intended
-- policy idempotently regardless of the table's current drifted state.
drop policy if exists "chatrooms_insert_own" on public.chatrooms;

create policy "chatrooms_insert_own"
  on public.chatrooms for insert
  with check (created_by = auth.uid() and kind <> 'global');
