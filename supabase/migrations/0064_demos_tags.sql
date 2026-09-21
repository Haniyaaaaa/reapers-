-- The demo-upload form's Tags picker (genre/style tags like SCI-FI, ROGUELIKE, plus whatever
-- custom tag someone types) was purely decorative: nothing selected there was ever sent to
-- createDemo or stored anywhere, so tags disappeared the moment the form closed.
alter table public.demos add column tags text[] not null default '{}';
