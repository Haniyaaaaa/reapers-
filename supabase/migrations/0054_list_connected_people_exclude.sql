-- RoomMembersScreen's invite picker needs to exclude people already in the room. Filtering
-- that out client-side after the fact (on a paginated page) would make "hasMore"/page sizes
-- unreliable — a page of 20 could shrink to fewer once existing members are removed. Filtering
-- server-side keeps pagination exact regardless of how many of the room's members happen to
-- also be connections.
-- Postgres overloads functions by argument *types*, so adding a 5th parameter via plain
-- `create or replace` would leave the old 4-arg signature in place as a separate overload —
-- ambiguous once both could match a call with defaults filled in. Drop it first.
drop function if exists public.list_connected_people(uuid, text, int, int);

create or replace function public.list_connected_people(
  viewer_id uuid,
  search text default null,
  limit_count int default 50,
  offset_count int default 0,
  exclude_ids uuid[] default '{}'
)
returns table (
  id uuid,
  display_name text,
  roles text[],
  skills text[]
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.roles, p.skills
  from public.connections c
  join public.profiles p
    on p.id = case when c.requester_id = viewer_id then c.addressee_id else c.requester_id end
  where c.status = 'accepted'
    and (c.requester_id = viewer_id or c.addressee_id = viewer_id)
    and (search is null or p.display_name ilike '%' || search || '%')
    and not (p.id = any(exclude_ids))
  order by p.display_name asc
  limit limit_count offset offset_count;
$$;

grant execute on function public.list_connected_people(uuid, text, int, int, uuid[]) to authenticated;
