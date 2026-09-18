-- Phase 15: CRUD completeness closure. Most of this phase is client-side (services/stores/UI)
-- since demos/events/chatrooms/experts/bookings/communities already had update_own/delete_own
-- (and, for communities, insert_own) RLS policies from Phases 2-6 that nothing ever called.
-- Only two things actually need schema changes:

-- 1. notifications had select/update but no delete policy.
create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = auth.uid());

-- 2. bookings' plain unique(expert_id, starts_at) constraint would keep a slot permanently
-- occupied even after cancellation (the cancelled row still holds the unique key), which
-- becomes a real bug the moment booking cancellation exists. Replace with a partial unique
-- index that only guards *active* bookings, freeing the slot once a booking is cancelled.
alter table public.bookings drop constraint bookings_expert_id_starts_at_key;
create unique index bookings_expert_slot_active_idx on public.bookings(expert_id, starts_at)
  where status <> 'cancelled';
