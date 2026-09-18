-- Adds the two new message kinds needed for photo/video sharing. Kept in its own migration
-- file (nothing else in this transaction) because Postgres won't let a new enum value be used
-- anywhere else in the same transaction it was added in.
alter type message_kind add value 'image';
alter type message_kind add value 'video';
