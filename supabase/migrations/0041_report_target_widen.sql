-- Kept as its own migration file: Postgres requires ALTER TYPE ... ADD VALUE to not run in the
-- same transaction as a statement that uses the new value, and Supabase applies each migration
-- file as one implicit transaction — splitting this out avoids an "unsafe use of new value of
-- enum type" error even though nothing in 0040 itself references these new values yet.
alter type public.report_target add value 'post';
alter type public.report_target add value 'post_comment';
