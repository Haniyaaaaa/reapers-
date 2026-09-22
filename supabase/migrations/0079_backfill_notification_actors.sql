-- 0078 made notify_new_message/notify_new_community/notify_new_event record actor_id going
-- forward, but a trigger can't reach back into rows that already existed — this is a one-time
-- backfill for those, recovering the actor from data that's still around.

-- Chat notifications: title is exactly the sender's display_name (see notify_new_message).
-- Match it against that chatroom's members, excluding the recipient themself — ambiguous only
-- if two members share the same display name, an acceptable gap for a best-effort backfill.
update public.notifications n
set actor_id = m.user_id
from public.chatroom_members m
join public.profiles p on p.id = m.user_id
where n.actor_id is null
  and n.target ->> 'screen' = 'ChatDetail'
  and m.chatroom_id = (n.target ->> 'id')::uuid
  and m.user_id <> n.user_id
  and p.display_name = n.title;

-- "New community: <name>" notifications: the actor is whoever created that community.
update public.notifications n
set actor_id = c.created_by
from public.communities c
where n.actor_id is null
  and n.target ->> 'screen' = 'CommunityDetail'
  and c.id = (n.target ->> 'id')::uuid
  and n.title like 'New community:%';

-- "New event: <title>" notifications: the actor is that event's host.
update public.notifications n
set actor_id = e.host_id
from public.events e
where n.actor_id is null
  and n.target ->> 'screen' = 'EventDetail'
  and e.id = (n.target ->> 'id')::uuid
  and n.title like 'New event:%';

-- Connection request/accepted notifications: their target already *is* the other person's
-- profile id (see notify_connection_requested/notify_connection_accepted, 0007_network.sql) —
-- no matching needed, just copy it across.
update public.notifications n
set actor_id = (n.target ->> 'id')::uuid
where n.actor_id is null
  and n.target ->> 'screen' = 'Profile'
  and n.title in ('New connection request', 'Connection accepted')
  and n.target ->> 'id' is not null
  -- Guards against a dangling id: an old request from an account that's since been deleted —
  -- the actor_id FK would otherwise reject the whole update.
  and exists (select 1 from public.profiles pr where pr.id = (n.target ->> 'id')::uuid);
