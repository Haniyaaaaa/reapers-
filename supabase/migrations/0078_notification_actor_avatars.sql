-- Notifications currently only carry a generic type icon (NotificationsScreen's
-- getNotificationIcon keyword-matches title/body) — every "someone did something" notification
-- looks the same, even though most of them are about one specific person (a message sender, a
-- connection request, a team applicant, an event host). Record who that person is so the app can
-- show their real avatar instead.

alter table public.notifications add column actor_id uuid references public.profiles(id) on delete set null;

-- Everyone can already read their own notifications (notifications_select_own); joining
-- profiles for the actor's avatar needs no extra policy since profiles are readable by any
-- authenticated user already.

-- Below: the same trigger functions notifications already come from, each re-defined only to
-- add `actor_id` to its insert — nothing else about their behavior changes.

create or replace function public.notify_support_reply()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ticket_owner uuid;
begin
  select user_id into ticket_owner from public.support_tickets where id = new.ticket_id;
  if ticket_owner is not null and ticket_owner <> new.sender_id then
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (
      ticket_owner,
      'Support reply',
      left(new.message, 140),
      jsonb_build_object('screen', 'SupportTicketDetail', 'id', new.ticket_id),
      new.sender_id
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_room_invite()
returns trigger language plpgsql security definer set search_path = public as $$
declare room_name text; inviter_name text;
begin
  select name into room_name from public.chatrooms where id = new.chatroom_id;
  select display_name into inviter_name from public.profiles where id = new.inviter_id;
  insert into public.notifications (user_id, title, body, target, actor_id)
  values (
    new.invitee_id,
    'Room invite',
    coalesce(inviter_name, 'Someone') || ' invited you to ' || coalesce(room_name, 'a room'),
    jsonb_build_object('screen', 'RoomInvites'),
    new.inviter_id
  );
  return new;
end;
$$;

create or replace function public.notify_join_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare room_name text; admin_row record;
begin
  select name into room_name from public.chatrooms where id = new.chatroom_id;
  for admin_row in
    select user_id from public.chatroom_members where chatroom_id = new.chatroom_id and role in ('owner', 'admin')
  loop
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (
      admin_row.user_id,
      'Join request',
      'Someone wants to join ' || coalesce(room_name, 'your room'),
      jsonb_build_object('screen', 'RoomJoinRequests', 'id', new.chatroom_id),
      new.user_id
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_connection_requested()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requester_name text;
begin
  select display_name into requester_name from public.profiles where id = new.requester_id;
  insert into public.notifications (user_id, title, body, target, actor_id)
  values (new.addressee_id, 'New connection request', coalesce(requester_name, 'Someone') || ' wants to connect.', jsonb_build_object('screen', 'Profile', 'id', new.requester_id), new.requester_id);
  return new;
end;
$$;

create or replace function public.notify_connection_accepted()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  addressee_name text;
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    select display_name into addressee_name from public.profiles where id = new.addressee_id;
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (new.requester_id, 'Connection accepted', coalesce(addressee_name, 'Someone') || ' accepted your connection request.', jsonb_build_object('screen', 'Profile', 'id', new.addressee_id), new.addressee_id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_team_application()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_poster_id uuid;
  applicant_name text;
  project_name text;
begin
  select t.poster_id, t.project into v_poster_id, project_name from public.team_requests t where t.id = new.team_request_id;
  select display_name into applicant_name from public.profiles where id = new.applicant_id;
  if v_poster_id is not null then
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (
      v_poster_id,
      'New team applicant',
      coalesce(applicant_name, 'Someone') || ' applied to ' || coalesce(project_name, 'your team request') || '.',
      jsonb_build_object('screen', 'TeamRequestApplicants', 'id', new.team_request_id),
      new.applicant_id
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_booking_created()
returns trigger
language plpgsql security definer set search_path = public as $$
declare requester_name text;
begin
  select display_name into requester_name from public.profiles where id = new.requester_id;
  insert into public.notifications (user_id, title, body, target, actor_id)
  values (
    new.expert_id,
    'New booking',
    coalesce(requester_name, 'Someone') || ' booked a session with you',
    jsonb_build_object('screen', 'MyBookings'),
    new.requester_id
  );
  return new;
end;
$$;

create or replace function public.notify_event_application_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
declare host_id uuid; event_title text;
begin
  select e.host_id, e.title into host_id, event_title from public.events e where e.id = new.event_id;
  insert into public.notifications (user_id, title, body, target, actor_id)
  values (host_id, 'New payment application',
    'Someone applied for ' || new.quantity || ' × ' || coalesce(new.plan_name, 'ticket') || ' to ' || coalesce(event_title, 'your event'),
    jsonb_build_object('screen', 'EventApplications', 'id', new.event_id),
    new.applicant_id);
  return new;
end;
$$;

create or replace function public.notify_new_community()
returns trigger language plpgsql security definer set search_path = public as $$
declare creator_name text; recipient record;
begin
  select display_name into creator_name from public.profiles where id = new.created_by;
  for recipient in
    select case when requester_id = new.created_by then addressee_id else requester_id end as user_id
    from public.connections
    where status = 'accepted' and (requester_id = new.created_by or addressee_id = new.created_by)
  loop
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (
      recipient.user_id,
      'New community: ' || new.name,
      coalesce(creator_name, 'Someone') || ' created a new community — check it out',
      jsonb_build_object('screen', 'CommunityDetail', 'id', new.id),
      new.created_by
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_new_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare host_name text; recipient record;
begin
  select display_name into host_name from public.profiles where id = new.host_id;
  for recipient in
    select case when requester_id = new.host_id then addressee_id else requester_id end as user_id
    from public.connections
    where status = 'accepted' and (requester_id = new.host_id or addressee_id = new.host_id)
  loop
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (
      recipient.user_id,
      'New event: ' || new.title,
      coalesce(host_name, 'Someone') || ' just listed a new event',
      jsonb_build_object('screen', 'EventDetail', 'id', new.id),
      new.host_id
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text; body_preview text; recipient record;
begin
  select display_name into sender_name from public.profiles where id = new.sender_id;
  body_preview := case
    when new.kind = 'gif' then 'Sent a GIF'
    when new.kind = 'image' then 'Sent a photo'
    when new.kind = 'video' then 'Sent a video'
    when new.kind = 'voice' then 'Sent a voice message'
    else left(new.content, 120)
  end;

  for recipient in
    select cm.user_id
    from public.chatroom_members cm
    left join public.user_settings us on us.user_id = cm.user_id
    where cm.chatroom_id = new.chatroom_id
      and cm.user_id != new.sender_id
      and cm.muted = false
      and coalesce(us.notify_chat, true) = true
  loop
    insert into public.notifications (user_id, title, body, target, actor_id)
    values (
      recipient.user_id,
      coalesce(sender_name, 'New message'),
      body_preview,
      jsonb_build_object('screen', 'ChatDetail', 'id', new.chatroom_id),
      new.sender_id
    );
  end loop;
  return new;
end;
$$;
