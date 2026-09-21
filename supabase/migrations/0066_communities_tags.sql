-- The Create Community form's Tags picker was decorative: nothing selected was ever sent to
-- createCommunity, so tags vanished on submit. Store them (custom ones included).
alter table public.communities add column tags text[] not null default '{}';
