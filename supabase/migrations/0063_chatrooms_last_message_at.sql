-- Rooms/DMs/communities never moved to the top of the Messages list when a new message came
-- in — listVisibleChatrooms ordered by chatrooms.created_at (fixed at room creation) and
-- last-message recency was only computed client-side afterward, purely for display, never for
-- ordering. Sorting the already-paginated page client-side can't fix this correctly either: a
-- room that just got a new message could be sitting on page 2 by created_at order. This needs
-- a real column to sort/paginate by at the DB level, kept in sync by a trigger.
alter table public.chatrooms add column last_message_at timestamptz not null default now();

-- Backfill from each room's actual most recent message, falling back to created_at for rooms
-- with no messages yet.
update public.chatrooms c set last_message_at = coalesce(
  (select max(m.created_at) from public.chatroom_messages m where m.chatroom_id = c.id),
  c.created_at
);

create or replace function public.bump_chatroom_last_message_at()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  update public.chatrooms set last_message_at = new.created_at where id = new.chatroom_id;
  return new;
end;
$$;

create trigger chatroom_messages_bump_last_message_at
  after insert on public.chatroom_messages
  for each row execute function public.bump_chatroom_last_message_at();

create index chatrooms_last_message_at_idx on public.chatrooms(last_message_at desc);
