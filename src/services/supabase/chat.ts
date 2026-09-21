import { supabase } from './client';
import type { ChatroomInsert, ChatroomMemberRow, ChatroomMessageRow, ChatroomRow, RoomInviteRow, RoomJoinRequestRow } from './types';
import type { ChatMessage, Chatroom, RoomInvite, RoomJoinRequest, RoomMember } from '../../types/chat';
import { PAGE_SIZE, type Page } from './pagination';
import { likePattern } from './searchText';

type ReactionRow = { message_id: string; user_id: string; emoji: string };

function roomRowToChatroom(
  row: ChatroomRow,
  membership: ChatroomMemberRow | null,
  lastMessage: string,
  lastMessageAt: string | undefined,
  unread: number,
  joinRequestPending = false,
): Chatroom {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    description: row.description,
    memberCount: row.member_count,
    lastMessage,
    lastMessageAt,
    unread: membership ? unread : 0,
    joined: !!membership,
    kind: row.kind,
    serverRegion: row.server_region ?? undefined,
    streakCount: membership?.streak_count,
    lastChatAt: membership?.last_chat_at ?? undefined,
    isPrivate: row.is_private,
    requiresApproval: row.requires_approval,
    joinRequestPending,
    pinned: membership?.pinned,
    muted: membership?.muted,
    avatar: row.avatar_url ?? undefined,
    communityId: row.community_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    myRole: membership?.role,
  };
}

function messageRowToMessage(
  row: ChatroomMessageRow,
  senderName: string,
  myUserId: string,
  reactionGroups: { emoji: string; count: number; mine: boolean }[],
  replyTo?: { id: string; senderName: string; content: string },
): ChatMessage {
  return {
    id: row.id,
    roomId: row.chatroom_id,
    senderId: row.sender_id,
    senderName,
    senderAvatar: senderAvatarCache.get(row.sender_id)?.uri,
    senderAvatarId: senderAvatarCache.get(row.sender_id)?.id,
    content: row.deleted ? 'This message was deleted' : row.content,
    createdAt: row.created_at,
    status: 'sent',
    mine: row.sender_id === myUserId,
    edited: row.edited,
    deleted: row.deleted,
    kind: row.kind,
    gifUri: row.gif_uri ?? undefined,
    voiceDurationSec: row.voice_duration_sec ?? undefined,
    mediaUrl: row.media_url ?? undefined,
    mediaThumbnailUrl: row.media_thumbnail_url ?? undefined,
    reactions: reactionGroups.length ? reactionGroups : undefined,
    pinned: row.pinned,
    forwarded: row.forwarded,
    replyTo,
  };
}

function groupReactions(rows: ReactionRow[], messageId: string, myUserId: string) {
  const forMessage = rows.filter((r) => r.message_id === messageId);
  const byEmoji = new Map<string, ReactionRow[]>();
  for (const r of forMessage) {
    const list = byEmoji.get(r.emoji) ?? [];
    list.push(r);
    byEmoji.set(r.emoji, list);
  }
  return Array.from(byEmoji.entries()).map(([emoji, rows]) => ({
    emoji,
    count: rows.length,
    mine: rows.some((r) => r.user_id === myUserId),
  }));
}

/** Every room visible to me per RLS (public rooms + private rooms I'm in), annotated with my
 * own membership row (join state, mute/pin, streak) and a best-effort last-message preview. */
export async function listVisibleChatrooms(userId: string, offset = 0, limit = PAGE_SIZE, search?: string): Promise<Page<Chatroom>> {
  // A search matches room name / tag / description server-side across ALL rooms. DMs are excluded
  // from it: their displayed name is the other person's profile name (set below), which the stored
  // room name doesn't reliably hold, so DMs are matched on the client instead.
  const searchPattern = search ? likePattern(search) : null;
  let roomsQuery = supabase.from('chatrooms').select('*');
  if (searchPattern) roomsQuery = roomsQuery.neq('kind', 'dm').or(`name.ilike.${searchPattern},tag.ilike.${searchPattern},description.ilike.${searchPattern}`);
  const [{ data: rooms, error: roomsErr }, { data: memberships, error: memErr }, { data: pendingRequests }] = await Promise.all([
    roomsQuery
      // Most-recently-active room first (WhatsApp-style), not creation order — kept in sync
      // by a trigger (0063_chatrooms_last_message_at.sql) so a room with a brand-new message
      // is correctly on page 1 even if it's an old room.
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase.from('chatroom_members').select('*').eq('user_id', userId),
    supabase.from('room_join_requests').select('chatroom_id').eq('requester_id', userId).eq('status', 'pending'),
  ]);
  if (roomsErr) throw roomsErr;
  if (memErr) throw memErr;

  const membershipMap = new Map((memberships ?? []).map((m) => [m.chatroom_id, m]));
  const pendingRoomIds = new Set((pendingRequests ?? []).map((r) => r.chatroom_id));
  const roomIds = (rooms ?? []).map((r) => r.id);
  const hasMore = roomIds.length === limit;
  if (roomIds.length === 0) return { rows: [], hasMore };

  // Best-effort preview: pull the most recent messages across all visible rooms and reduce
  // to one per room client-side (PostgREST has no DISTINCT ON). Fine at MVP chat volume.
  const { data: recent } = await supabase
    .from('chatroom_messages')
    .select('chatroom_id, content, kind, sender_id, created_at')
    .in('chatroom_id', roomIds)
    .order('created_at', { ascending: false })
    .limit(500);

  const lastByRoom = new Map<string, string>();
  const lastAtByRoom = new Map<string, string>();
  const unreadByRoom = new Map<string, number>();
  for (const m of recent ?? []) {
    if (!lastByRoom.has(m.chatroom_id)) {
      lastByRoom.set(m.chatroom_id, m.kind === 'gif' ? 'GIF' : m.kind === 'voice' ? 'Voice note' : m.kind === 'sticker' ? 'Sticker' : m.content);
      lastAtByRoom.set(m.chatroom_id, m.created_at);
    }
    // A message the viewer sent themselves was never "unread" — only someone else's message
    // newer than the viewer's own last_read_at counts.
    const membership = membershipMap.get(m.chatroom_id);
    if (membership && m.sender_id !== userId && new Date(m.created_at) > new Date(membership.last_read_at)) {
      unreadByRoom.set(m.chatroom_id, (unreadByRoom.get(m.chatroom_id) ?? 0) + 1);
    }
  }

  const roomsList = (rooms ?? []).map((r) =>
    roomRowToChatroom(r, membershipMap.get(r.id) ?? null, lastByRoom.get(r.id) ?? '', lastAtByRoom.get(r.id), unreadByRoom.get(r.id) ?? 0, pendingRoomIds.has(r.id)),
  );

  // A DM room's own `name`/`avatar_url` is whichever participant created it — meaningless to
  // show back to either viewer. Override with the *other* member's profile so each side sees
  // the person they're talking to, not a name fixed at creation time.
  const dmRoomIds = roomsList.filter((r) => r.kind === 'dm' && r.joined).map((r) => r.id);
  if (dmRoomIds.length > 0) {
    const { data: peers } = await supabase
      .from('chatroom_members')
      .select('chatroom_id, user_id, profiles(display_name, avatar_uri, avatar_id)')
      .in('chatroom_id', dmRoomIds)
      .neq('user_id', userId);
    const peerRows = peers as unknown as
      | { chatroom_id: string; user_id: string; profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null }[]
      | null;
    const peerByRoom = new Map((peerRows ?? []).map((p) => [p.chatroom_id, p]));
    for (const r of roomsList) {
      const peer = peerByRoom.get(r.id);
      if (peer) {
        r.name = peer.profiles?.display_name ?? r.name;
        r.avatar = peer.profiles?.avatar_uri ?? undefined;
        r.avatarId = peer.profiles?.avatar_id ?? undefined;
        r.peerId = peer.user_id;
      }
    }
  }

  return { rows: roomsList, hasMore };
}

/** Finds the existing DM room between these two users, or creates one. DM rooms only ever
 * have 2 members, so "shared DM room" is unambiguous. `name` is set to the *other* user's
 * name from the creator's own perspective at creation time — cosmetically irrelevant since
 * listVisibleChatrooms always overrides it per-viewer with the real peer's profile above;
 * this is just a sane non-null value for the initial row. Membership for the peer is
 * inserted directly (the creator's own-room insert path already permits adding any member,
 * same as every other room-creation flow in this app) rather than going through the
 * invite/request flow built for regular rooms — a DM is implicitly mutual, there's nothing
 * to accept. */
export async function getOrCreateDirectMessageRoom(userId: string, otherUserId: string, otherDisplayName: string): Promise<string> {
  const { data: myDmRooms, error: myErr } = await supabase
    .from('chatroom_members')
    .select('chatroom_id, chatrooms!inner(kind)')
    .eq('user_id', userId)
    .eq('chatrooms.kind', 'dm');
  if (myErr) throw myErr;
  const roomIds = (myDmRooms ?? []).map((r) => r.chatroom_id);

  if (roomIds.length > 0) {
    const { data: shared, error: sharedErr } = await supabase
      .from('chatroom_members')
      .select('chatroom_id')
      .eq('user_id', otherUserId)
      .in('chatroom_id', roomIds)
      .limit(1);
    if (sharedErr) throw sharedErr;
    if (shared && shared.length > 0) return shared[0].chatroom_id;
  }

  const room = await createRoom({ name: otherDisplayName, kind: 'dm', is_private: true, created_by: userId });
  const { error: addErr } = await supabase.from('chatroom_members').insert({ chatroom_id: room.id, user_id: otherUserId });
  if (addErr) throw addErr;
  return room.id;
}

export async function createRoom(input: ChatroomInsert): Promise<Chatroom> {
  const { data, error } = await supabase.from('chatrooms').insert(input).select().single();
  if (error) {
    // TEMP DIAGNOSTIC — remove once the chatrooms RLS 42501 is root-caused. Folds the
    // comparison directly into the thrown error so it shows up in the same captureException
    // output already being copied, instead of a separate console.log that's easy to miss.
    if (error.code === '42501') {
      const { data: authUser } = await supabase.auth.getUser();
      throw new Error(
        `${error.message} [diagnostic: created_by_sent=${input.created_by} session_user_id=${authUser?.user?.id ?? 'null'} kind=${input.kind}]`,
      );
    }
    throw error;
  }
  // The auto-join trigger has already inserted the creator's membership row by now.
  const { data: membership } = await supabase
    .from('chatroom_members')
    .select('*')
    .eq('chatroom_id', data.id)
    .eq('user_id', input.created_by)
    .maybeSingle();
  return roomRowToChatroom(data, membership ?? null, '', undefined, 0);
}

export async function updateRoom(roomId: string, patch: { name?: string; description?: string; tag?: string; avatarUrl?: string }): Promise<void> {
  const { error } = await supabase
    .from('chatrooms')
    .update({ name: patch.name, description: patch.description, tag: patch.tag, avatar_url: patch.avatarUrl })
    .eq('id', roomId);
  if (error) throw error;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase.from('chatrooms').delete().eq('id', roomId);
  if (error) throw error;
}

export async function joinRoom(userId: string, roomId: string): Promise<void> {
  const { error } = await supabase.from('chatroom_members').insert({ chatroom_id: roomId, user_id: userId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Room membership: real member list, invites (private rooms), join requests
// (public rooms with requires_approval) — supabase/migrations/0021_room_membership.sql
// ---------------------------------------------------------------------------

/** The other DM participant's last_read_at — chatroom_members_select_visible already lets any
 * room member read every member row for a room they're in, so no new RLS is needed. Compared
 * against a sent message's created_at to render a real read receipt instead of the old code's
 * "every sent message shows a blue double-check forever" bug. */
export async function getPeerLastRead(chatroomId: string, peerUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('chatroom_members')
    .select('last_read_at')
    .eq('chatroom_id', chatroomId)
    .eq('user_id', peerUserId)
    .maybeSingle();
  if (error) throw error;
  return data?.last_read_at ?? null;
}

export async function listRoomMembers(chatroomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from('chatroom_members')
    .select('user_id, role, profiles(display_name, avatar_uri, avatar_id)')
    .eq('chatroom_id', chatroomId);
  if (error) throw error;
  return (data as unknown as { user_id: string; role: RoomMember['role']; profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null }[]).map(
    (row) => ({
      userId: row.user_id,
      name: row.profiles?.display_name ?? 'Someone',
      avatarUri: row.profiles?.avatar_uri ?? undefined,
      avatarId: row.profiles?.avatar_id ?? undefined,
      role: row.role,
    }),
  );
}

/** Owner-only per chatroom_members_update_role_by_owner RLS. */
export async function setRoomMemberRole(chatroomId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
  const { error } = await supabase.from('chatroom_members').update({ role }).eq('chatroom_id', chatroomId).eq('user_id', userId);
  if (error) throw error;
}

/** Owner/admin per chatroom_members_delete_by_admin RLS. */
export async function removeRoomMember(chatroomId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('chatroom_members').delete().eq('chatroom_id', chatroomId).eq('user_id', userId);
  if (error) throw error;
}

export async function inviteToRoom(chatroomId: string, inviterId: string, inviteeId: string): Promise<void> {
  const { error } = await supabase.from('room_invites').insert({ chatroom_id: chatroomId, inviter_id: inviterId, invitee_id: inviteeId });
  if (error) throw error;
}

function inviteRowToRoomInvite(row: RoomInviteRow, roomName: string, inviterName: string): RoomInvite {
  return {
    id: row.id,
    chatroomId: row.chatroom_id,
    roomName,
    inviterId: row.inviter_id,
    inviterName,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listMyRoomInvites(userId: string): Promise<RoomInvite[]> {
  const { data, error } = await supabase
    .from('room_invites')
    .select('*, chatrooms(name), profiles!room_invites_inviter_id_fkey(display_name)')
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as (RoomInviteRow & { chatrooms: { name: string } | null; profiles: { display_name: string } | null })[]).map((row) =>
    inviteRowToRoomInvite(row, row.chatrooms?.name ?? 'a room', row.profiles?.display_name ?? 'Someone'),
  );
}

export async function respondRoomInvite(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.from('room_invites').update({ status: accept ? 'accepted' : 'declined' }).eq('id', id);
  if (error) throw error;
}

export async function requestToJoinRoom(chatroomId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('room_join_requests').insert({ chatroom_id: chatroomId, requester_id: userId });
  if (error) throw error;
}

export async function listJoinRequestsForRoom(chatroomId: string): Promise<RoomJoinRequest[]> {
  const { data, error } = await supabase
    .from('room_join_requests')
    .select('*, profiles(display_name, avatar_uri, avatar_id)')
    .eq('chatroom_id', chatroomId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (
    data as unknown as (RoomJoinRequestRow & { profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null })[]
  ).map((row) => ({
    id: row.id,
    chatroomId: row.chatroom_id,
    requesterId: row.requester_id,
    requesterName: row.profiles?.display_name ?? 'Someone',
    requesterAvatarUri: row.profiles?.avatar_uri ?? undefined,
    requesterAvatarId: row.profiles?.avatar_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function respondJoinRequest(id: string, approve: boolean): Promise<void> {
  const { error } = await supabase.from('room_join_requests').update({ status: approve ? 'approved' : 'rejected' }).eq('id', id);
  if (error) throw error;
}

export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  const { error } = await supabase.from('chatroom_members').delete().eq('chatroom_id', roomId).eq('user_id', userId);
  if (error) throw error;
}

export async function updateMembership(
  userId: string,
  roomId: string,
  patch: { muted?: boolean; pinned?: boolean; lastReadAt?: string; streakCount?: number; lastChatAt?: string },
): Promise<void> {
  const update: {
    muted?: boolean;
    pinned?: boolean;
    last_read_at?: string;
    streak_count?: number;
    last_chat_at?: string | null;
  } = {};
  if (patch.muted !== undefined) update.muted = patch.muted;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.lastReadAt !== undefined) update.last_read_at = patch.lastReadAt;
  if (patch.streakCount !== undefined) update.streak_count = patch.streakCount;
  if (patch.lastChatAt !== undefined) update.last_chat_at = patch.lastChatAt;
  const { error } = await supabase.from('chatroom_members').update(update).eq('chatroom_id', roomId).eq('user_id', userId);
  if (error) throw error;
}

const senderNameCache = new Map<string, string>();
const senderAvatarCache = new Map<string, { uri?: string; id?: string }>();

async function resolveSenderNames(userIds: string[]): Promise<Map<string, string>> {
  const missing = userIds.filter((id) => !senderNameCache.has(id) || !senderAvatarCache.has(id));
  if (missing.length) {
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_uri, avatar_id').in('id', missing);
    for (const row of data ?? []) {
      senderNameCache.set(row.id, row.display_name);
      senderAvatarCache.set(row.id, { uri: row.avatar_uri ?? undefined, id: row.avatar_id ?? undefined });
    }
  }
  return senderNameCache;
}

export async function listMessages(roomId: string, myUserId: string, opts?: { before?: string; limit?: number }): Promise<ChatMessage[]> {
  let query = supabase
    .from('chatroom_messages')
    .select('*')
    .eq('chatroom_id', roomId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data: rows, error } = await query;
  if (error) throw error;
  const messages = rows ?? [];
  if (messages.length === 0) return [];

  const ids = messages.map((m) => m.id);
  const [{ data: reactions }, names] = await Promise.all([
    supabase.from('message_reactions').select('message_id, user_id, emoji').in('message_id', ids),
    resolveSenderNames(Array.from(new Set(messages.map((m) => m.sender_id)))),
  ]);

  const byId = new Map(messages.map((m) => [m.id, m]));
  return messages.map((row) => {
    const replyRow = row.reply_to_id ? byId.get(row.reply_to_id) : undefined;
    const replyTo = replyRow
      ? { id: replyRow.id, senderName: names.get(replyRow.sender_id) ?? 'Someone', content: replyRow.kind === 'gif' ? 'GIF' : replyRow.content }
      : undefined;
    return messageRowToMessage(row, names.get(row.sender_id) ?? 'Someone', myUserId, groupReactions(reactions ?? [], row.id, myUserId), replyTo);
  });
}

export async function sendMessage(input: {
  roomId: string;
  senderId: string;
  content: string;
  kind?: 'text' | 'gif' | 'voice' | 'image' | 'video' | 'sticker';
  gifUri?: string;
  voiceDurationSec?: number;
  forwarded?: boolean;
  replyToId?: string;
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
}): Promise<ChatroomMessageRow> {
  const { data, error } = await supabase
    .from('chatroom_messages')
    .insert({
      chatroom_id: input.roomId,
      sender_id: input.senderId,
      content: input.content,
      kind: input.kind ?? 'text',
      gif_uri: input.gifUri,
      voice_duration_sec: input.voiceDurationSec,
      forwarded: input.forwarded,
      reply_to_id: input.replyToId,
      media_url: input.mediaUrl,
      media_thumbnail_url: input.mediaThumbnailUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function editMessage(id: string, content: string): Promise<void> {
  const { error } = await supabase.from('chatroom_messages').update({ content, edited: true }).eq('id', id);
  if (error) throw error;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('chatroom_messages').update({ deleted: true, content: 'This message was deleted' }).eq('id', id);
  if (error) throw error;
}

export async function togglePinMessage(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('chatroom_messages').update({ pinned }).eq('id', id);
  if (error) throw error;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string, currentlyMine: boolean): Promise<void> {
  if (currentlyMine) {
    const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
    if (error) throw error;
  }
}

export async function toggleStar(messageId: string, userId: string, currentlyStarred: boolean): Promise<void> {
  if (currentlyStarred) {
    const { error } = await supabase.from('message_stars').delete().eq('message_id', messageId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('message_stars').insert({ message_id: messageId, user_id: userId });
    if (error) throw error;
  }
}

export async function listMyStarredMessageIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('message_stars').select('message_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.message_id));
}

/** Backs the "..." menu's "Starred messages" screen — scoped to one room (not every starred
 * message across the whole app), same as WhatsApp's per-chat starred list. Two-step lookup
 * (message_stars has no chatroom_id column of its own) since Supabase can't filter a join by a
 * column on the far side of it in one call here. */
export async function listStarredMessagesForRoom(roomId: string, userId: string, myUserId: string): Promise<ChatMessage[]> {
  const { data: starRows, error: starErr } = await supabase.from('message_stars').select('message_id').eq('user_id', userId);
  if (starErr) throw starErr;
  const ids = (starRows ?? []).map((r) => r.message_id);
  if (ids.length === 0) return [];
  const { data: rows, error } = await supabase
    .from('chatroom_messages')
    .select('*')
    .eq('chatroom_id', roomId)
    .eq('deleted', false)
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const messages = rows ?? [];
  if (messages.length === 0) return [];
  const names = await resolveSenderNames(Array.from(new Set(messages.map((m) => m.sender_id))));
  return messages.map((row) => ({ ...messageRowToMessage(row, names.get(row.sender_id) ?? 'Someone', myUserId, []), starred: true }));
}

/** Backs the "..." menu's "Pinned messages" screen — the room's full pinned set, independent
 * of what happens to be in the currently-scrolled-to window of the live chat thread (unlike
 * the `pinned` banner in ChatDetailScreen, which only sees already-loaded messages). */
export async function listPinnedMessagesForRoom(roomId: string, myUserId: string): Promise<ChatMessage[]> {
  const { data: rows, error } = await supabase
    .from('chatroom_messages')
    .select('*')
    .eq('chatroom_id', roomId)
    .eq('pinned', true)
    .eq('deleted', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const messages = rows ?? [];
  if (messages.length === 0) return [];
  const names = await resolveSenderNames(Array.from(new Set(messages.map((m) => m.sender_id))));
  return messages.map((row) => ({ ...messageRowToMessage(row, names.get(row.sender_id) ?? 'Someone', myUserId, []), pinned: true }));
}

/** "Delete for me" — hides a message from this user's own view without touching the shared
 * row (0032_message_media_and_hides.sql), unlike deleteMessage below which is sender-only and
 * visible to everyone. */
export async function hideMessageForMe(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('message_hides').insert({ message_id: messageId, user_id: userId });
  if (error) throw error;
}

export async function listMyHiddenMessageIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('message_hides').select('message_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.message_id));
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;

/** Photos/Videos tabs of the room media gallery — plain kind + room filter, paginated the same
 * way listMessages is. */
export async function listRoomMedia(
  roomId: string,
  kind: 'image' | 'video',
  opts?: { before?: string; limit?: number },
): Promise<{ id: string; mediaUrl: string; mediaThumbnailUrl?: string; createdAt: string }[]> {
  let query = supabase
    .from('chatroom_messages')
    .select('id, media_url, media_thumbnail_url, created_at')
    .eq('chatroom_id', roomId)
    .eq('kind', kind)
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 30);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? [])
    .filter((row) => !!row.media_url)
    .map((row) => ({ id: row.id, mediaUrl: row.media_url!, mediaThumbnailUrl: row.media_thumbnail_url ?? undefined, createdAt: row.created_at }));
}

/** Links tab of the room media gallery — text messages that look like they contain a URL.
 * No og:title/image preview fetching (MVP scope, same pragmatism as listVisibleChatrooms'
 * client-side last-message reduction above); a message can contain more than one link, so
 * each match becomes its own row. */
export async function listRoomLinks(
  roomId: string,
  opts?: { before?: string; limit?: number },
): Promise<{ id: string; url: string; senderName: string; createdAt: string }[]> {
  let query = supabase
    .from('chatroom_messages')
    .select('id, content, sender_id, created_at')
    .eq('chatroom_id', roomId)
    .eq('kind', 'text')
    .eq('deleted', false)
    .ilike('content', '%http%')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 30);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const names = await resolveSenderNames(Array.from(new Set(rows.map((r) => r.sender_id))));
  const links: { id: string; url: string; senderName: string; createdAt: string }[] = [];
  for (const row of rows) {
    const matches = row.content.match(URL_PATTERN) ?? [];
    for (const url of matches) {
      links.push({ id: `${row.id}:${links.length}`, url, senderName: names.get(row.sender_id) ?? 'Someone', createdAt: row.created_at });
    }
  }
  return links;
}

/** Converts one just-inserted row (from a Realtime INSERT event) into a ChatMessage without
 * the batch-oriented lookups `listMessages` does — a brand-new message has no reactions yet,
 * and only needs its own sender's name resolved. */
export async function hydrateRealtimeMessage(row: ChatroomMessageRow, myUserId: string): Promise<ChatMessage> {
  const names = await resolveSenderNames([row.sender_id]);
  let replyTo: { id: string; senderName: string; content: string } | undefined;
  if (row.reply_to_id) {
    const { data: replyRow } = await supabase.from('chatroom_messages').select('*').eq('id', row.reply_to_id).maybeSingle();
    if (replyRow) {
      const replyNames = await resolveSenderNames([replyRow.sender_id]);
      replyTo = { id: replyRow.id, senderName: replyNames.get(replyRow.sender_id) ?? 'Someone', content: replyRow.kind === 'gif' ? 'GIF' : replyRow.content };
    }
  }
  return messageRowToMessage(row, names.get(row.sender_id) ?? 'Someone', myUserId, [], replyTo);
}
