-- Real bug found live: an expert's own listing showed up in their own Experts directory (no
-- exclusion in listVerifiedExperts) with a working "Book" button, and nothing server-side
-- stopped requester_id = expert_id from ever being inserted -- an expert could book themselves.
-- The client-side fix (excluding the viewer's own id from the directory query) closes the UI
-- path, but per this app's standing "client hint, server enforces" pattern, the real boundary
-- needs to live here too -- a raw API call could still self-book without this.
alter table public.bookings
  add constraint bookings_no_self_booking check (requester_id <> expert_id);
