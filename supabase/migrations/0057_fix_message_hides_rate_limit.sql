-- Fixes "Delete for me" silently failing: enforce_rate_limit() (0018_rate_limiting.sql)
-- hardcodes a `created_at` column, but message_hides (0032_message_media_and_hides.sql) named
-- its timestamp column `hidden_at` — every insert hit "column created_at does not exist",
-- rolling back the client's optimistic delete so the message reappeared. Renaming to match
-- every other rate-limited table's convention is simpler and safer than special-casing the
-- shared trigger function; Postgres updates the existing index/constraints automatically.
alter table public.message_hides rename column hidden_at to created_at;
