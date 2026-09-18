-- Phase 22 fix 1: push_tokens.ts upserts with `onConflict: 'user_id,token'` (registerForPush
-- re-registers on every SIGNED_IN, including a relaunch where the same token is already
-- registered) — that hits the ON CONFLICT DO UPDATE path, which needs an UPDATE policy to
-- authorize under RLS. Only INSERT/DELETE existed, so any token re-registration threw a
-- 42501 RLS violation. Real bug, not a hardening nice-to-have.

create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
