-- "New Message" (ChatDirectoryScreen) needs to list every person the viewer is actually
-- connected to, searchable and paginated — sourcing it from `people`/list_network_people()
-- was wrong at any real scale: that RPC caps at 100 *discoverable* profiles overall, so a
-- connection outside that top-100 window silently never appeared in "New Message" even
-- though they were genuinely connected. This mirrors list_network_people's existing
-- security-definer + pagination shape but queries the connections table directly, so results
-- are always exactly "who I'm connected to," bounded by a real LIMIT/OFFSET, not a hardcoded
-- directory cap.
create or replace function public.list_connected_people(
  viewer_id uuid,
  search text default null,
  limit_count int default 50,
  offset_count int default 0
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
  order by p.display_name asc
  limit limit_count offset offset_count;
$$;

grant execute on function public.list_connected_people(uuid, text, int, int) to authenticated;
