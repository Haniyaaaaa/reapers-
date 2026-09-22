-- Lets an expert link their Cal.com event type, so a booking's meeting link can be generated
-- automatically instead of the expert typing one in by hand every time (see
-- supabase/functions/create-cal-booking). Both parts of the reference are needed: Cal.com
-- identifies a bookable event type by <username>/<event-type-slug>.
alter table public.experts add column cal_username text;
alter table public.experts add column cal_event_slug text;
