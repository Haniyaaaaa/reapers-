-- Adds the sticker message kind (a transparent-PNG image sent with no chat-bubble chrome
-- around it, unlike a regular photo). Kept in its own migration — Postgres won't let a new
-- enum value be used anywhere else in the same transaction it was added in.
alter type message_kind add value 'sticker';
