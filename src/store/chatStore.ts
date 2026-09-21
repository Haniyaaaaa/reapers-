import * as VideoThumbnails from 'expo-video-thumbnails';
import { create } from 'zustand';
import * as chatApi from '../services/supabase/chat';
import { uploadChatImage, uploadChatVideo, uploadChatVoice } from '../services/supabase/storage';
import { captureException, track } from '../services/analytics/analytics';
import { nextStreak } from '../utils/streak';
import { reconcile, swr, type FetchOpts } from './swr';
import type { ReactionChange } from '../services/supabase/realtime';
import type { ChatMessage, Chatroom, RoomInvite, RoomJoinRequest, RoomMember } from '../types/chat';

type RoomLink = { id: string; url: string; senderName: string; createdAt: string };
type RoomMediaState = { images: ChatMessage[]; imagesHasMore: boolean; videos: ChatMessage[]; videosHasMore: boolean; links: RoomLink[]; linksHasMore: boolean };
const MEDIA_PAGE_SIZE = 30;

function emptyRoomMedia(existing?: RoomMediaState): RoomMediaState {
  return existing ?? { images: [], imagesHasMore: false, videos: [], videosHasMore: false, links: [], linksHasMore: false };
}

/** Applies a new-message patch to one room and re-sorts the whole list by recency — the
 * WhatsApp behavior of a chat jumping to the top the instant a message comes in, rather than
 * waiting for the next fetchRooms() to notice. The DB trigger (0063) keeps server-side
 * ordering in sync for the next page load; this is purely the same thing done optimistically
 * on the client so it's instant. */
function bumpRoomToTop(rooms: Chatroom[], roomId: string, patch: Partial<Chatroom>): Chatroom[] {
  const next = rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r));
  return [...next].sort((a, b) => {
    const at = a.lastMessageAt ?? a.lastChatAt ?? '';
    const bt = b.lastMessageAt ?? b.lastChatAt ?? '';
    return bt.localeCompare(at);
  });
}

type ChatState = {
  rooms: Chatroom[];
  roomsHasMore: boolean;
  roomsLoading: boolean;
  roomsError: string | null;
  messages: Record<string, ChatMessage[]>;
  messagesLoading: Record<string, boolean>;
  starredIds: Set<string>;
  hiddenIds: Set<string>;
  typingRoomId: string | null;
  peerLastRead: Record<string, string | null>;

  fetchRooms: (userId: string, opts?: FetchOpts) => Promise<void>;
  fetchPeerLastRead: (roomId: string, peerId: string) => Promise<void>;
  loadMoreRooms: (userId: string) => Promise<void>;
  createRoom: (
    userId: string,
    room: {
      name: string;
      description: string;
      isPrivate?: boolean;
      requiresApproval?: boolean;
      avatar?: string;
      kind: 'room' | 'server';
      tag: string;
      serverRegion?: string;
      communityId?: string;
    },
  ) => Promise<string>;
  joinRoom: (userId: string, roomId: string) => Promise<void>;
  startDirectMessage: (userId: string, otherUserId: string, otherDisplayName: string) => Promise<string>;
  leaveRoom: (userId: string, roomId: string) => Promise<void>;
  toggleMute: (userId: string, roomId: string) => Promise<void>;
  togglePin: (userId: string, roomId: string) => Promise<void>;
  markRead: (userId: string, roomId: string) => Promise<void>;
  updateRoom: (roomId: string, patch: { name?: string; description?: string; tag?: string }) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;

  fetchMessages: (roomId: string, myUserId: string) => Promise<void>;
  loadOlderMessages: (roomId: string, myUserId: string) => Promise<void>;
  sendMessage: (
    roomId: string,
    myUserId: string,
    senderName: string,
    content: string,
    extra?: { kind?: ChatMessage['kind']; gifUri?: string; voiceDurationSec?: number; forwarded?: boolean; replyTo?: ChatMessage['replyTo'] },
  ) => Promise<void>;
  sendMediaMessage: (
    roomId: string,
    myUserId: string,
    senderName: string,
    kind: 'image' | 'video' | 'sticker' | 'voice',
    localUri: string,
    voiceDurationSec?: number,
  ) => Promise<void>;
  retryMessage: (roomId: string, myUserId: string, messageId: string) => Promise<void>;
  retryAllFailed: (myUserId: string) => Promise<void>;
  editMessage: (roomId: string, id: string, content: string) => Promise<void>;
  deleteMessage: (roomId: string, id: string) => Promise<void>;
  deleteMessageForMe: (roomId: string, id: string, userId: string) => Promise<void>;
  reactToMessage: (roomId: string, id: string, emoji: string, userId: string) => Promise<void>;
  toggleStarMessage: (id: string, userId: string) => Promise<void>;
  togglePinMessage: (roomId: string, id: string) => Promise<void>;
  ensureStarredLoaded: (userId: string) => Promise<void>;
  ensureHiddenLoaded: (userId: string) => Promise<void>;

  roomMedia: Record<string, RoomMediaState>;
  fetchRoomImages: (roomId: string) => Promise<void>;
  loadMoreRoomImages: (roomId: string) => Promise<void>;
  fetchRoomVideos: (roomId: string) => Promise<void>;
  loadMoreRoomVideos: (roomId: string) => Promise<void>;
  fetchRoomLinks: (roomId: string) => Promise<void>;
  loadMoreRoomLinks: (roomId: string) => Promise<void>;

  roomStarred: Record<string, ChatMessage[]>;
  roomStarredLoading: Record<string, boolean>;
  fetchRoomStarred: (roomId: string, userId: string) => Promise<void>;
  roomPinned: Record<string, ChatMessage[]>;
  roomPinnedLoading: Record<string, boolean>;
  fetchRoomPinned: (roomId: string, userId: string) => Promise<void>;

  setTyping: (roomId: string | null) => void;

  handleRealtimeInsert: (roomId: string, myUserId: string, row: Parameters<typeof chatApi.hydrateRealtimeMessage>[0]) => Promise<void>;
  handleRealtimeReaction: (roomId: string, myUserId: string, change: ReactionChange) => void;
  handleRealtimeUpdate: (
    roomId: string,
    row: { id: string; content: string; edited: boolean; deleted: boolean; pinned: boolean; media_url?: string | null; media_thumbnail_url?: string | null },
  ) => void;

  // Room membership: real member list, private-room invites, gated-public-room join requests.
  members: Record<string, RoomMember[]>;
  fetchMembers: (roomId: string) => Promise<void>;
  setMemberRole: (roomId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  removeMember: (roomId: string, userId: string) => Promise<void>;

  inviteToRoom: (roomId: string, inviterId: string, inviteeId: string) => Promise<void>;

  roomInvites: RoomInvite[];
  roomInvitesLoading: boolean;
  fetchMyRoomInvites: (userId: string) => Promise<void>;
  respondRoomInvite: (id: string, accept: boolean) => Promise<void>;

  requestToJoinRoom: (roomId: string, userId: string) => Promise<void>;

  joinRequests: Record<string, RoomJoinRequest[]>;
  fetchJoinRequests: (roomId: string) => Promise<void>;
  respondJoinRequest: (roomId: string, id: string, approve: boolean) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  roomsHasMore: false,
  roomsLoading: false,
  roomsError: null,
  messages: {},
  messagesLoading: {},
  starredIds: new Set(),
  hiddenIds: new Set(),
  roomMedia: {},
  roomStarred: {},
  roomStarredLoading: {},
  roomPinned: {},
  roomPinnedLoading: {},
  typingRoomId: null,
  peerLastRead: {},
  members: {},
  roomInvites: [],
  roomInvitesLoading: false,
  joinRequests: {},

  fetchRooms: (userId, opts) =>
    swr(
      `rooms:${userId}`,
      async () => {
        // `roomsLoading` = "loading with nothing to show" — a refresh over an existing list must not
        // flip it, or the screen swaps the list for skeletons on every refetch.
        set((s) => ({ roomsLoading: s.rooms.length === 0, roomsError: null }));
        try {
          const { rows, hasMore } = await chatApi.listVisibleChatrooms(userId, 0);
          set((s) => ({ rooms: reconcile(s.rooms, rows), roomsHasMore: hasMore, roomsLoading: false }));
          return true;
        } catch (err) {
          set({ roomsLoading: false, roomsError: err instanceof Error ? err.message : 'Could not load chat' });
          return false;
        }
      },
      opts,
    ),

  loadMoreRooms: async (userId) => {
    try {
      const { rows, hasMore } = await chatApi.listVisibleChatrooms(userId, get().rooms.length);
      set((s) => ({ rooms: [...s.rooms, ...rows], roomsHasMore: hasMore }));
    } catch (err) {
      set({ roomsError: err instanceof Error ? err.message : 'Could not load more rooms' });
    }
  },

  fetchPeerLastRead: async (roomId, peerId) => {
    try {
      const lastRead = await chatApi.getPeerLastRead(roomId, peerId);
      set((s) => ({ peerLastRead: { ...s.peerLastRead, [roomId]: lastRead } }));
    } catch (err) {
      captureException(err);
    }
  },

  createRoom: async (userId, room) => {
    try {
      const created = await chatApi.createRoom({
        name: room.name,
        description: room.description,
        is_private: room.isPrivate,
        requires_approval: room.requiresApproval,
        avatar_url: room.avatar,
        kind: room.kind,
        tag: room.tag,
        server_region: room.serverRegion,
        community_id: room.communityId,
        created_by: userId,
      });
      set((s) => ({ rooms: [created, ...s.rooms] }));
      return created.id;
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  // joinRoom rethrows (unlike the toggle-style actions below) — ChatDirectoryScreen's
  // "Join <room>" confirm sheet must not navigate into a room the join actually failed for.
  joinRoom: async (userId, roomId) => {
    try {
      await chatApi.joinRoom(userId, roomId);
      set((s) => ({
        rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, joined: true, memberCount: r.memberCount + 1 } : r)),
      }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  // Rethrows — the caller (e.g. ProfileScreen's "Message" button) navigates into the room
  // only once this genuinely succeeds. Refetches the room list afterward so the new/found DM
  // room (with its peer name/avatar correctly resolved by listVisibleChatrooms) is present
  // in `rooms` before ChatDetailScreen looks it up by id.
  startDirectMessage: async (userId, otherUserId, otherDisplayName) => {
    try {
      const roomId = await chatApi.getOrCreateDirectMessageRoom(userId, otherUserId, otherDisplayName);
      await get().fetchRooms(userId);
      return roomId;
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  // Every action below is fired bare (no local try/catch at the call site — they're single
  // taps on a toggle/menu item), so on failure it rolls back its own optimistic update and
  // reports to Sentry rather than rethrowing into an unhandled rejection.
  leaveRoom: async (userId, roomId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (room?.kind === 'global') return;
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, joined: false, memberCount: Math.max(0, r.memberCount - 1) } : r)),
    }));
    try {
      await chatApi.leaveRoom(userId, roomId);
    } catch (err) {
      if (room) set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? room : r)) }));
      captureException(err);
    }
  },

  toggleMute: async (userId, roomId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    const next = !room?.muted;
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, muted: next } : r)) }));
    try {
      await chatApi.updateMembership(userId, roomId, { muted: next });
    } catch (err) {
      if (room) set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? room : r)) }));
      captureException(err);
    }
  },

  togglePin: async (userId, roomId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    const next = !room?.pinned;
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, pinned: next } : r)) }));
    try {
      await chatApi.updateMembership(userId, roomId, { pinned: next });
    } catch (err) {
      if (room) set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? room : r)) }));
      captureException(err);
    }
  },

  markRead: async (userId, roomId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r)) }));
    try {
      await chatApi.updateMembership(userId, roomId, { lastReadAt: new Date().toISOString() });
    } catch (err) {
      if (room) set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? room : r)) }));
      captureException(err);
    }
  },

  updateRoom: async (roomId, patch) => {
    const room = get().rooms.find((r) => r.id === roomId);
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) }));
    try {
      await chatApi.updateRoom(roomId, patch);
    } catch (err) {
      if (room) set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? room : r)) }));
      captureException(err);
      throw err; // ChatDetailScreen's rename modal keeps its own try/finally around this call
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await chatApi.deleteRoom(roomId);
      set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) }));
    } catch (err) {
      captureException(err);
      throw err; // ChatDetailScreen's delete-confirm sheet keeps its own try/finally around this call
    }
  },

  fetchMessages: async (roomId, myUserId) => {
    // Only "loading" when there's nothing to show yet — reopening a chat paints the cached thread
    // immediately and refreshes it quietly underneath.
    set((s) => (s.messages[roomId]?.length ? s : { messagesLoading: { ...s.messagesLoading, [roomId]: true } }));
    try {
      const fetched = await chatApi.listMessages(roomId, myUserId);
      const starred = get().starredIds;
      const hidden = get().hiddenIds;
      const server = fetched.filter((m) => !hidden.has(m.id)).map((m) => ({ ...m, starred: starred.has(m.id) }));
      set((s) => {
        const prev = s.messages[roomId] ?? [];
        // Merge instead of replace: keep sends the server hasn't seen yet (temp-…) and older pages
        // the user already scrolled back through, so a refetch never makes messages vanish/jump.
        const pending = prev.filter((m) => m.id.startsWith('temp-'));
        const serverIds = new Set(server.map((m) => m.id));
        const oldestServer = server.length ? server[server.length - 1].createdAt : null;
        const older = oldestServer
          ? prev.filter((m) => !m.id.startsWith('temp-') && !serverIds.has(m.id) && m.createdAt < oldestServer)
          : [];
        const merged = [...pending, ...server, ...older];
        return {
          messages: { ...s.messages, [roomId]: reconcile(prev, merged) },
          messagesLoading: { ...s.messagesLoading, [roomId]: false },
        };
      });
    } catch {
      set((s) => ({ messagesLoading: { ...s.messagesLoading, [roomId]: false } }));
    }
  },

  loadOlderMessages: async (roomId, myUserId) => {
    const existing = get().messages[roomId] ?? [];
    if (existing.length === 0) return;
    const oldest = existing[existing.length - 1];
    const older = await chatApi.listMessages(roomId, myUserId, { before: oldest.createdAt });
    if (older.length === 0) return;
    const starred = get().starredIds;
    const hidden = get().hiddenIds;
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: [...(s.messages[roomId] ?? []), ...older.filter((m) => !hidden.has(m.id)).map((m) => ({ ...m, starred: starred.has(m.id) }))],
      },
    }));
  },

  sendMessage: async (roomId, myUserId, senderName, content, extra) => {
    const tempId = `temp-${Date.now()}`;
    const kind = extra?.kind ?? 'text';
    const optimistic: ChatMessage = {
      id: tempId,
      roomId,
      senderId: myUserId,
      senderName,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
      mine: true,
      kind,
      gifUri: extra?.gifUri,
      voiceDurationSec: extra?.voiceDurationSec,
      forwarded: extra?.forwarded,
      replyTo: extra?.replyTo,
    };
    set((s) => ({ messages: { ...s.messages, [roomId]: [optimistic, ...(s.messages[roomId] ?? [])] } }));

    try {
      const row = await chatApi.sendMessage({
        roomId,
        senderId: myUserId,
        content,
        kind,
        gifUri: extra?.gifUri,
        voiceDurationSec: extra?.voiceDurationSec,
        forwarded: extra?.forwarded,
        replyToId: extra?.replyTo?.id,
      });
      set((s) => ({
        messages: {
          ...s.messages,
          [roomId]: (s.messages[roomId] ?? [])
            .map((m) => (m.id === tempId ? { ...m, id: row.id, createdAt: row.created_at, status: 'sent' as const } : m))
            // A refetch may already have delivered the real row — never keep two with one id.
            .filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i),
        },
        rooms: (() => {
          const r = s.rooms.find((x) => x.id === roomId);
          const streak = r?.kind === 'dm' ? nextStreak(r.lastChatAt, r.streakCount) : r?.streakCount;
          return bumpRoomToTop(s.rooms, roomId, {
            lastMessage: kind === 'gif' ? 'GIF' : kind === 'voice' ? 'Voice note' : content,
            lastMessageAt: row.created_at,
            lastChatAt: r?.kind === 'dm' ? row.created_at : r?.lastChatAt,
            streakCount: streak,
          });
        })(),
      }));
      if (get().rooms.find((r) => r.id === roomId)?.kind === 'dm') {
        await chatApi.updateMembership(myUserId, roomId, { lastChatAt: row.created_at, streakCount: get().rooms.find((r) => r.id === roomId)?.streakCount });
      }
      track('message_sent', { kind });
    } catch {
      set((s) => ({
        messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)) },
      }));
    }
  },

  sendMediaMessage: async (roomId, myUserId, senderName, kind, localUri, voiceDurationSec) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      roomId,
      senderId: myUserId,
      senderName,
      content: kind === 'image' ? 'Photo' : kind === 'sticker' ? 'Sticker' : kind === 'voice' ? 'Voice message' : 'Video',
      createdAt: new Date().toISOString(),
      status: 'sending',
      mine: true,
      kind,
      mediaUrl: localUri,
      voiceDurationSec,
    };
    set((s) => ({ messages: { ...s.messages, [roomId]: [optimistic, ...(s.messages[roomId] ?? [])] } }));

    try {
      const mediaUrl = kind === 'video' ? await uploadChatVideo(myUserId, localUri) : kind === 'voice' ? await uploadChatVoice(myUserId, localUri) : await uploadChatImage(myUserId, localUri);
      let mediaThumbnailUrl: string | undefined;
      if (kind === 'video') {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(localUri, { time: 1000 });
          mediaThumbnailUrl = await uploadChatImage(myUserId, uri);
        } catch {
          // Frame extraction can fail on some formats/platforms — the video still sends fine,
          // it just falls back to a plain play button with no poster image.
        }
      }
      const row = await chatApi.sendMessage({
        roomId,
        senderId: myUserId,
        content: optimistic.content,
        kind,
        mediaUrl,
        mediaThumbnailUrl,
        voiceDurationSec,
      });
      set((s) => ({
        messages: {
          ...s.messages,
          [roomId]: (s.messages[roomId] ?? []).map((m) =>
            m.id === tempId ? { ...m, id: row.id, createdAt: row.created_at, status: 'sent', mediaUrl, mediaThumbnailUrl } : m,
          ),
        },
        rooms: bumpRoomToTop(s.rooms, roomId, {
          lastMessage: kind === 'image' ? 'Photo' : kind === 'sticker' ? 'Sticker' : kind === 'voice' ? 'Voice message' : 'Video',
          lastMessageAt: row.created_at,
        }),
      }));
      track('message_sent', { kind });
    } catch {
      set((s) => ({
        messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)) },
      }));
    }
  },

  retryMessage: async (roomId, myUserId, messageId) => {
    const msg = (get().messages[roomId] ?? []).find((m) => m.id === messageId);
    if (!msg) return;
    set((s) => ({
      messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).filter((m) => m.id !== messageId) },
    }));
    if ((msg.kind === 'image' || msg.kind === 'video' || msg.kind === 'sticker' || msg.kind === 'voice') && msg.mediaUrl) {
      // A failed media message's mediaUrl is still the original local file:// URI — the
      // upload never completed, so re-run it from scratch rather than resending an empty row.
      await get().sendMediaMessage(roomId, myUserId, msg.senderName, msg.kind, msg.mediaUrl, msg.voiceDurationSec);
      return;
    }
    await get().sendMessage(roomId, myUserId, msg.senderName, msg.content, {
      kind: msg.kind,
      gifUri: msg.gifUri,
      voiceDurationSec: msg.voiceDurationSec,
      forwarded: msg.forwarded,
      replyTo: msg.replyTo,
    });
  },

  retryAllFailed: async (myUserId) => {
    const { messages } = get();
    for (const [roomId, msgs] of Object.entries(messages)) {
      for (const m of msgs.filter((m) => m.status === 'failed')) {
        await get().retryMessage(roomId, myUserId, m.id);
      }
    }
  },

  editMessage: async (roomId, id, content) => {
    const prevMsg = (get().messages[roomId] ?? []).find((m) => m.id === id);
    set((s) => ({
      messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? { ...m, content, edited: true } : m)) },
    }));
    try {
      await chatApi.editMessage(id, content);
    } catch (err) {
      if (prevMsg) set((s) => ({ messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? prevMsg : m)) } }));
      captureException(err);
    }
  },

  deleteMessage: async (roomId, id) => {
    const prevMsg = (get().messages[roomId] ?? []).find((m) => m.id === id);
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? { ...m, deleted: true, content: 'This message was deleted' } : m)),
      },
    }));
    try {
      await chatApi.deleteMessage(id);
    } catch (err) {
      if (prevMsg) set((s) => ({ messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? prevMsg : m)) } }));
      captureException(err);
    }
  },

  deleteMessageForMe: async (roomId, id, userId) => {
    const prevMsg = (get().messages[roomId] ?? []).find((m) => m.id === id);
    set((s) => ({
      messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).filter((m) => m.id !== id) },
      hiddenIds: new Set(s.hiddenIds).add(id),
    }));
    try {
      await chatApi.hideMessageForMe(id, userId);
    } catch (err) {
      set((s) => ({
        messages: prevMsg ? { ...s.messages, [roomId]: [prevMsg, ...(s.messages[roomId] ?? [])] } : s.messages,
        hiddenIds: new Set([...s.hiddenIds].filter((x) => x !== id)),
      }));
      captureException(err);
    }
  },

  reactToMessage: async (roomId, id, emoji, userId) => {
    const prevMsg = (get().messages[roomId] ?? []).find((m) => m.id === id);
    const existing = prevMsg?.reactions?.find((r) => r.emoji === emoji);
    const mine = existing?.mine ?? false;
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] ?? []).map((m) => {
          if (m.id !== id) return m;
          const reactions = [...(m.reactions ?? [])];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          if (idx === -1) reactions.push({ emoji, count: 1, mine: true });
          else if (mine) {
            if (reactions[idx].count <= 1) reactions.splice(idx, 1);
            else reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, mine: false };
          } else reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, mine: true };
          return { ...m, reactions };
        }),
      },
    }));
    try {
      await chatApi.toggleReaction(id, userId, emoji, mine);
    } catch (err) {
      if (prevMsg) set((s) => ({ messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? prevMsg : m)) } }));
      captureException(err);
    }
  },

  toggleStarMessage: async (id, userId) => {
    const prevStarred = new Set(get().starredIds);
    const starred = new Set(prevStarred);
    const wasStarred = starred.has(id);
    if (wasStarred) starred.delete(id);
    else starred.add(id);
    set((s) => ({
      starredIds: starred,
      messages: Object.fromEntries(
        Object.entries(s.messages).map(([roomId, msgs]) => [roomId, msgs.map((m) => (m.id === id ? { ...m, starred: !wasStarred } : m))]),
      ),
    }));
    try {
      await chatApi.toggleStar(id, userId, wasStarred);
    } catch (err) {
      set((s) => ({
        starredIds: prevStarred,
        messages: Object.fromEntries(
          Object.entries(s.messages).map(([roomId, msgs]) => [roomId, msgs.map((m) => (m.id === id ? { ...m, starred: wasStarred } : m))]),
        ),
      }));
      captureException(err);
    }
  },

  togglePinMessage: async (roomId, id) => {
    const prevMsg = (get().messages[roomId] ?? []).find((m) => m.id === id);
    const next = !prevMsg?.pinned;
    set((s) => ({
      messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? { ...m, pinned: next } : m)) },
    }));
    try {
      await chatApi.togglePinMessage(id, next);
    } catch (err) {
      if (prevMsg) set((s) => ({ messages: { ...s.messages, [roomId]: (s.messages[roomId] ?? []).map((m) => (m.id === id ? prevMsg : m)) } }));
      captureException(err);
    }
  },

  ensureStarredLoaded: async (userId) => {
    if (get().starredIds.size > 0) return;
    try {
      const ids = await chatApi.listMyStarredMessageIds(userId);
      set({ starredIds: ids });
    } catch (err) {
      captureException(err);
    }
  },

  ensureHiddenLoaded: async (userId) => {
    if (get().hiddenIds.size > 0) return;
    try {
      const ids = await chatApi.listMyHiddenMessageIds(userId);
      set({ hiddenIds: ids });
    } catch (err) {
      captureException(err);
    }
  },

  fetchRoomImages: async (roomId) => {
    const rows = await chatApi.listRoomMedia(roomId, 'image', { limit: MEDIA_PAGE_SIZE });
    const images = rows.map((r) => ({ id: r.id, roomId, senderId: '', senderName: '', content: 'Photo', createdAt: r.createdAt, status: 'sent' as const, kind: 'image' as const, mediaUrl: r.mediaUrl, mediaThumbnailUrl: r.mediaThumbnailUrl }));
    set((s) => ({ roomMedia: { ...s.roomMedia, [roomId]: { ...emptyRoomMedia(s.roomMedia[roomId]), images, imagesHasMore: rows.length === MEDIA_PAGE_SIZE } } }));
  },

  loadMoreRoomImages: async (roomId) => {
    const existing = get().roomMedia[roomId]?.images ?? [];
    if (existing.length === 0) return;
    const rows = await chatApi.listRoomMedia(roomId, 'image', { before: existing[existing.length - 1].createdAt, limit: MEDIA_PAGE_SIZE });
    const more = rows.map((r) => ({ id: r.id, roomId, senderId: '', senderName: '', content: 'Photo', createdAt: r.createdAt, status: 'sent' as const, kind: 'image' as const, mediaUrl: r.mediaUrl, mediaThumbnailUrl: r.mediaThumbnailUrl }));
    set((s) => ({
      roomMedia: { ...s.roomMedia, [roomId]: { ...emptyRoomMedia(s.roomMedia[roomId]), images: [...existing, ...more], imagesHasMore: rows.length === MEDIA_PAGE_SIZE } },
    }));
  },

  fetchRoomVideos: async (roomId) => {
    const rows = await chatApi.listRoomMedia(roomId, 'video', { limit: MEDIA_PAGE_SIZE });
    const videos = rows.map((r) => ({ id: r.id, roomId, senderId: '', senderName: '', content: 'Video', createdAt: r.createdAt, status: 'sent' as const, kind: 'video' as const, mediaUrl: r.mediaUrl, mediaThumbnailUrl: r.mediaThumbnailUrl }));
    set((s) => ({ roomMedia: { ...s.roomMedia, [roomId]: { ...emptyRoomMedia(s.roomMedia[roomId]), videos, videosHasMore: rows.length === MEDIA_PAGE_SIZE } } }));
  },

  loadMoreRoomVideos: async (roomId) => {
    const existing = get().roomMedia[roomId]?.videos ?? [];
    if (existing.length === 0) return;
    const rows = await chatApi.listRoomMedia(roomId, 'video', { before: existing[existing.length - 1].createdAt, limit: MEDIA_PAGE_SIZE });
    const more = rows.map((r) => ({ id: r.id, roomId, senderId: '', senderName: '', content: 'Video', createdAt: r.createdAt, status: 'sent' as const, kind: 'video' as const, mediaUrl: r.mediaUrl, mediaThumbnailUrl: r.mediaThumbnailUrl }));
    set((s) => ({
      roomMedia: { ...s.roomMedia, [roomId]: { ...emptyRoomMedia(s.roomMedia[roomId]), videos: [...existing, ...more], videosHasMore: rows.length === MEDIA_PAGE_SIZE } },
    }));
  },

  fetchRoomLinks: async (roomId) => {
    const links = await chatApi.listRoomLinks(roomId, { limit: MEDIA_PAGE_SIZE });
    set((s) => ({ roomMedia: { ...s.roomMedia, [roomId]: { ...emptyRoomMedia(s.roomMedia[roomId]), links, linksHasMore: links.length === MEDIA_PAGE_SIZE } } }));
  },

  loadMoreRoomLinks: async (roomId) => {
    const existing = get().roomMedia[roomId]?.links ?? [];
    if (existing.length === 0) return;
    const more = await chatApi.listRoomLinks(roomId, { before: existing[existing.length - 1].createdAt, limit: MEDIA_PAGE_SIZE });
    set((s) => ({
      roomMedia: { ...s.roomMedia, [roomId]: { ...emptyRoomMedia(s.roomMedia[roomId]), links: [...existing, ...more], linksHasMore: more.length === MEDIA_PAGE_SIZE } },
    }));
  },

  fetchRoomStarred: async (roomId, userId) => {
    set((s) => ({ roomStarredLoading: { ...s.roomStarredLoading, [roomId]: true } }));
    try {
      const rows = await chatApi.listStarredMessagesForRoom(roomId, userId, userId);
      set((s) => ({ roomStarred: { ...s.roomStarred, [roomId]: rows }, roomStarredLoading: { ...s.roomStarredLoading, [roomId]: false } }));
    } catch (err) {
      captureException(err);
      set((s) => ({ roomStarredLoading: { ...s.roomStarredLoading, [roomId]: false } }));
    }
  },

  fetchRoomPinned: async (roomId, userId) => {
    set((s) => ({ roomPinnedLoading: { ...s.roomPinnedLoading, [roomId]: true } }));
    try {
      const rows = await chatApi.listPinnedMessagesForRoom(roomId, userId);
      set((s) => ({ roomPinned: { ...s.roomPinned, [roomId]: rows }, roomPinnedLoading: { ...s.roomPinnedLoading, [roomId]: false } }));
    } catch (err) {
      captureException(err);
      set((s) => ({ roomPinnedLoading: { ...s.roomPinnedLoading, [roomId]: false } }));
    }
  },

  setTyping: (roomId) => set({ typingRoomId: roomId }),

  handleRealtimeInsert: async (roomId, myUserId, row) => {
    if ((get().messages[roomId] ?? []).some((m) => m.id === row.id)) return;
    if (row.sender_id === myUserId) return; // our own sends are reconciled synchronously in sendMessage
    if (get().hiddenIds.has(row.id)) return;
    const message = await chatApi.hydrateRealtimeMessage(row, myUserId);
    const preview = message.kind === 'gif' ? 'GIF' : message.kind === 'voice' ? 'Voice note' : message.kind === 'sticker' ? 'Sticker' : message.content;
    set((s) => ({
      messages: { ...s.messages, [roomId]: [{ ...message, starred: s.starredIds.has(message.id) }, ...(s.messages[roomId] ?? [])] },
      rooms: bumpRoomToTop(s.rooms, roomId, { lastMessage: preview, lastMessageAt: row.created_at }),
    }));
  },

  // Patches ONE message's reaction counts from a realtime event instead of refetching the whole
  // thread. Our own reactions are already applied optimistically; events for messages that aren't
  // in this thread (the subscription covers every room) are ignored.
  handleRealtimeReaction: (roomId, myUserId, change) => {
    if (change.userId === myUserId) return;
    set((s) => {
      const thread = s.messages[roomId];
      const idx = thread ? thread.findIndex((m) => m.id === change.messageId) : -1;
      if (!thread || idx === -1) return s;
      const msg = thread[idx];
      const reactions = [...(msg.reactions ?? [])];
      const r = reactions.findIndex((x) => x.emoji === change.emoji);
      if (change.type === 'INSERT') {
        if (r === -1) reactions.push({ emoji: change.emoji, count: 1, mine: false });
        else reactions[r] = { ...reactions[r], count: reactions[r].count + 1 };
      } else if (r !== -1) {
        if (reactions[r].count <= 1) reactions.splice(r, 1);
        else reactions[r] = { ...reactions[r], count: reactions[r].count - 1 };
      }
      const next = [...thread];
      next[idx] = { ...msg, reactions };
      return { messages: { ...s.messages, [roomId]: next } };
    });
  },

  handleRealtimeUpdate: (roomId, row) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] ?? []).map((m) =>
          m.id === row.id
            ? {
                ...m,
                content: row.deleted ? 'This message was deleted' : row.content,
                edited: row.edited,
                deleted: row.deleted,
                pinned: row.pinned,
                mediaUrl: row.media_url ?? m.mediaUrl,
                mediaThumbnailUrl: row.media_thumbnail_url ?? m.mediaThumbnailUrl,
              }
            : m,
        ),
      },
    }));
  },

  fetchMembers: async (roomId) => {
    try {
      const members = await chatApi.listRoomMembers(roomId);
      set((s) => ({ members: { ...s.members, [roomId]: members } }));
    } catch (err) {
      captureException(err);
    }
  },

  setMemberRole: async (roomId, userId, role) => {
    const prev = get().members[roomId];
    set((s) => ({
      members: { ...s.members, [roomId]: (s.members[roomId] ?? []).map((m) => (m.userId === userId ? { ...m, role } : m)) },
    }));
    try {
      await chatApi.setRoomMemberRole(roomId, userId, role);
    } catch (err) {
      if (prev) set((s) => ({ members: { ...s.members, [roomId]: prev } }));
      captureException(err);
      throw err; // RoomMembersScreen's admin action sheet shows a real error instead of a silent no-op
    }
  },

  removeMember: async (roomId, userId) => {
    const prev = get().members[roomId];
    set((s) => ({ members: { ...s.members, [roomId]: (s.members[roomId] ?? []).filter((m) => m.userId !== userId) } }));
    try {
      await chatApi.removeRoomMember(roomId, userId);
    } catch (err) {
      if (prev) set((s) => ({ members: { ...s.members, [roomId]: prev } }));
      captureException(err);
      throw err; // RoomMembersScreen's admin action sheet shows a real error instead of a silent no-op
    }
  },

  inviteToRoom: async (roomId, inviterId, inviteeId) => {
    try {
      await chatApi.inviteToRoom(roomId, inviterId, inviteeId);
    } catch (err) {
      captureException(err);
      throw err; // the invite picker keeps its own try/catch to show the specific error
    }
  },

  fetchMyRoomInvites: async (userId) => {
    set({ roomInvitesLoading: true });
    try {
      const invites = await chatApi.listMyRoomInvites(userId);
      set({ roomInvites: invites, roomInvitesLoading: false });
    } catch (err) {
      captureException(err);
      set({ roomInvitesLoading: false });
    }
  },

  respondRoomInvite: async (id, accept) => {
    const prev = get().roomInvites;
    set((s) => ({ roomInvites: s.roomInvites.filter((i) => i.id !== id) }));
    try {
      await chatApi.respondRoomInvite(id, accept);
    } catch (err) {
      set({ roomInvites: prev });
      captureException(err);
    }
  },

  requestToJoinRoom: async (roomId, userId) => {
    try {
      await chatApi.requestToJoinRoom(roomId, userId);
      // Marked locally rather than waiting on a refetch — the room's status must flip to
      // "pending" the moment the request goes through, or a second tap re-opens the same
      // "Request to join" prompt and lets someone send duplicate requests.
      set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, joinRequestPending: true } : r)) }));
    } catch (err) {
      captureException(err);
      throw err; // ChatDirectoryScreen shows a specific "couldn't send request" message
    }
  },

  fetchJoinRequests: async (roomId) => {
    try {
      const requests = await chatApi.listJoinRequestsForRoom(roomId);
      set((s) => ({ joinRequests: { ...s.joinRequests, [roomId]: requests } }));
    } catch (err) {
      captureException(err);
    }
  },

  respondJoinRequest: async (roomId, id, approve) => {
    const prev = get().joinRequests[roomId];
    set((s) => ({ joinRequests: { ...s.joinRequests, [roomId]: (s.joinRequests[roomId] ?? []).filter((r) => r.id !== id) } }));
    try {
      await chatApi.respondJoinRequest(id, approve);
    } catch (err) {
      if (prev) set((s) => ({ joinRequests: { ...s.joinRequests, [roomId]: prev } }));
      captureException(err);
    }
  },
}));
