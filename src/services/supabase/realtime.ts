import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';
import type { ChatroomMessageRow, NotificationRow, PostCommentRow, PostRow } from './types';

/** Live INSERT/UPDATE feed for one room's messages — replaces the old generic
 * src/services/realtime/socket.ts stub, which modeled a Socket.IO-style single connection
 * with named events. Supabase Realtime is channel-scoped and Postgres-CDC-based, so each
 * subscription target (a room, a user's notification feed, …) gets its own purpose-built
 * function instead of one grab-bag socket. */
export function subscribeToRoomMessages(
  roomId: string,
  onInsert: (row: ChatroomMessageRow) => void,
  onUpdate: (row: ChatroomMessageRow) => void,
): () => void {
  const channel = supabase
    .channel(`room-messages:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chatroom_messages', filter: `chatroom_id=eq.${roomId}` },
      (payload) => onInsert(payload.new as ChatroomMessageRow),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chatroom_messages', filter: `chatroom_id=eq.${roomId}` },
      (payload) => onUpdate(payload.new as ChatroomMessageRow),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToRoomReactions(roomId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`room-reactions:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToNotifications(userId: string, onInsert: (row: NotificationRow) => void): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as NotificationRow),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Feed-wide, one subscription per feed screen — cheap regardless of user count since it's one
 * channel per *client*, not per row. Deliberately does NOT drive an auto-insert into the
 * rendered feed (see postsStore.checkForNewPosts) — the caller decides what "new post arrived"
 * means (typically: flip a "New posts" banner flag), never a live prepend, so scrolling isn't
 * disrupted on a busy global feed. */
let postsFeedChannelSeq = 0;

/** Unlike the room/user/post-scoped channels above, this one has no natural per-caller ID to
 * key its topic on — every caller wants the same "posts" table. A bare fixed topic name
 * ('posts-feed') means a fast remount (e.g. a tab being frozen/reactivated by React
 * Navigation) can call this again before the previous instance's `removeChannel` finishes;
 * supabase-js hands back the SAME already-subscribed channel for a repeated topic name, and
 * `.on()` on an already-subscribed channel throws. A monotonic per-call suffix guarantees a
 * fresh topic every time, avoiding the collision entirely. */
export function subscribeToNewPosts(onInsert: (row: PostRow) => void): () => void {
  const topic = `posts-feed:${++postsFeedChannelSeq}`;
  const channel = supabase
    .channel(topic)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => onInsert(payload.new as PostRow))
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Per-post reaction/comment-count live updates — intentionally scoped to ONE post, not the
 * whole feed list. At real scale, one channel per visible feed card would multiply into
 * thousands of concurrent subscriptions for a nice-to-have live count; instead only the
 * single-post comments screen (one post, actively open) subscribes, bounding concurrent
 * subscriptions by "how many single-post screens are open" rather than feed size × user count. */
export function subscribeToPostReactions(postId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`post-reactions:${postId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions', filter: `post_id=eq.${postId}` }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPostComments(postId: string, onInsert: (row: PostCommentRow) => void): () => void {
  const channel = supabase
    .channel(`post-comments:${postId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
      (payload) => onInsert(payload.new as PostCommentRow),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Ephemeral typing indicator — broadcast only, never written to a table. */
export function joinTypingChannel(roomId: string, onTyping: (userId: string) => void): {
  channel: RealtimeChannel;
  notifyTyping: (userId: string) => void;
  leave: () => void;
} {
  const channel = supabase
    .channel(`typing:${roomId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, (payload) => onTyping(payload.payload.userId as string))
    .subscribe();

  return {
    channel,
    notifyTyping: (userId: string) => {
      channel.send({ type: 'broadcast', event: 'typing', payload: { userId } });
    },
    leave: () => {
      supabase.removeChannel(channel);
    },
  };
}
