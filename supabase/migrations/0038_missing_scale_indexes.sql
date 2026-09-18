-- Indexes for query patterns that never got one: found by cross-referencing RLS-filtered
-- queries in src/services/supabase/*.ts against the existing index list. All currently run as
-- sequential scans; harmless at today's row counts, real cost once these tables grow.

-- admin.ts listPendingByRole/listAllUsers: filter by approval_status, order by created_at.
create index profiles_approval_status_created_idx on public.profiles(approval_status, created_at);

-- experts.ts listExperts (main discovery screen): verified = true, ordered by rating desc.
create index experts_verified_rating_idx on public.experts(verified, rating desc);
-- admin.ts listPendingExperts: verified = false, ordered by applied_at.
create index experts_verified_applied_idx on public.experts(verified, applied_at);
-- admin.ts listVerifiedExpertsAdmin: verified = true, ordered by verified_at desc.
create index experts_verified_verified_at_idx on public.experts(verified, verified_at desc);

-- admin.ts listTickets: optional status filter, ordered by created_at desc.
create index support_tickets_status_created_idx on public.support_tickets(status, created_at desc);

-- admin.ts listAllSubscriptions: ordered by created_at desc, no filter.
create index user_subscriptions_created_idx on public.user_subscriptions(created_at desc);
