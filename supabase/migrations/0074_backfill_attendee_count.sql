-- 0072 changed attendee_count to count tickets (sum of event_rsvps.ticket_count) but only via the
-- trigger, so events that already existed kept a stale count until their next RSVP change (a
-- freshly created event showed 0 going even though its host was going). Recompute once.
update public.events e set attendee_count = public.event_going_tickets(e.id);
