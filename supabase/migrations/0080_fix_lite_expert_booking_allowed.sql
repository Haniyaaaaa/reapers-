-- Migration 0068 set expert_booking_allowed = false only WHERE name = 'Pro', missing the
-- 'Lite' plan which also had expert_booking_allowed = true. As long as ANY active plan has
-- expert_booking_allowed = true, effective_limits() gates bookings for non-subscribers — so
-- the "Booking is a Pro feature" sheet kept showing for free users even after 0068 ran.
-- Fix: set expert_booking_allowed = false on ALL plans so bookings stay free for everyone
-- (same intent as 0068 — no admin has deliberately enabled the gate for any plan).
update public.subscription_plans
set expert_booking_allowed = false
where expert_booking_allowed = true;
