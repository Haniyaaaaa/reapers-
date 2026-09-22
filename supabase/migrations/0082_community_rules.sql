-- CreateCommunityScreen has always collected a "Rules" text field (pre-filled with a sensible
-- default), but nothing ever saved it — there was no column for it, and the client never sent
-- it. Joining a community skipped straight to membership with no way to see the rules the
-- creator wrote, because there was never anywhere for them to have gone.
alter table public.communities add column rules text;
