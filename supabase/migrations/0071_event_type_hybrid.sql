-- Events could only be Online or Physical, but the events UI already has a Hybrid tab and the
-- filter now offers Online / Onsite / Hybrid — a Hybrid event needs to exist to be found.
-- Kept in its own migration: Postgres won't let a new enum value be used in the transaction
-- that added it.
alter type event_type add value 'Hybrid';
