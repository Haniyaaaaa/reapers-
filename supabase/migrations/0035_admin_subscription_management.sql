-- Admins can now grant a subscription to any user and extend an existing one directly from
-- the Admin Console (AdminUserDetailScreen / AdminSubscriptionsScreen) — for comping test
-- accounts and support cases, without going through the PayFast checkout flow. The existing
-- "insert_own" policy (0012_onboarding_addendum.sql) only lets a user insert their own row;
-- this adds the admin path as an additional permissive policy (OR'd with it).
create policy "user_subscriptions_insert_admin"
  on public.user_subscriptions for insert
  with check (public.is_admin());
