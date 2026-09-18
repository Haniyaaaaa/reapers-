-- Notifies every other member of a chatroom (DM, room, or community chatroom — they're all
-- the same `chatrooms`/`chatroom_messages` tables, kind just tags which) when a new message
-- is sent, so notifications actually fire for chat like every other notification type already
-- does. Honors the two mute mechanisms that already existed in the schema but had nothing to
-- gate until now: the per-room `chatroom_members.muted` toggle (ChatDetailScreen's "Mute
-- notifications" menu item) and the global `user_settings.notify_chat` preference.
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
    insert into public.notifications (user_id, title, body, target)
    values (
      recipient.user_id,
      coalesce(sender_name, 'New message'),
      body_preview,
      jsonb_build_object('screen', 'ChatDetail', 'id', new.chatroom_id)
    );
  end loop;
  return new;
end;
$$;
create trigger chatroom_messages_notify_new after insert on public.chatroom_messages
  for each row execute function public.notify_new_message();
