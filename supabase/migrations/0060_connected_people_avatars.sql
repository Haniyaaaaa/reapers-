-- Connection lists (New Message, room invite picker) rendered the wrong avatar because the RPC
-- didn't return avatar_uri / avatar_id. Return type changes, so the function must be dropped first.
drop function if exists public.list_connected_people(uuid, text, int, int, uuid[]);

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
  skills text[],
  avatar_uri text,
  avatar_id text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.roles, p.skills, p.avatar_uri, p.avatar_id
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
