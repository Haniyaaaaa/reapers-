-- Notifies a creator's accepted connections when they create a new community or list a new
-- event — same fan-out pattern as notify_join_request (0021_room_membership.sql). Bounded to
-- connections rather than every user so this doesn't unbounded-fan-out at scale.
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
    insert into public.notifications (user_id, title, body, target)
    values (
      recipient.user_id,
      'New community: ' || new.name,
      coalesce(creator_name, 'Someone') || ' created a new community — check it out',
      jsonb_build_object('screen', 'CommunityDetail', 'id', new.id)
    );
  end loop;
  return new;
end;
$$;
create trigger communities_notify_new after insert on public.communities
  for each row execute function public.notify_new_community();

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
    insert into public.notifications (user_id, title, body, target)
    values (
      recipient.user_id,
      'New event: ' || new.title,
      coalesce(host_name, 'Someone') || ' just listed a new event',
      jsonb_build_object('screen', 'EventDetail', 'id', new.id)
    );
  end loop;
  return new;
end;
$$;
create trigger events_notify_new after insert on public.events
  for each row execute function public.notify_new_event();
