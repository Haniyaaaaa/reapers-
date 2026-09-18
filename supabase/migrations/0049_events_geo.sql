-- Real "within 50km" filtering needs real coordinates — events previously only stored a free-
-- text location string. Nullable: online events and physical events created before this
-- migration have no coordinates, and a distance filter correctly excludes them (can't verify
-- a distance for a location we don't know) rather than guessing.
alter table public.events add column lat double precision;
alter table public.events add column lng double precision;
