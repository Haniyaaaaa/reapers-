import { create } from 'zustand';
import {
  communities as seedCommunities,
  demoComments as seedComments,
  demos as seedDemos,
  events as seedEvents,
  expertSlots as seedSlots,
  messages as seedMessages,
  notifications as seedNotes,
  personCards as seedPeople,
  reviews as seedReviews,
  rooms as seedRooms,
  teamRequests as seedTeams,
} from '../data/mock';
import type { ChatMessage, Chatroom } from '../types/chat';
import type { Community } from '../types/community';
import type { Demo, RubricScores } from '../types/demo';
import type { GameEvent, RsvpStatus } from '../types/event';
import type { ExpertSlot, DemoComment, NotificationItem, PersonCard, Review, TeamRequest } from '../types/extra';
import { nextStreak } from '../utils/streak';

function applyMembership(communities: Community[], rooms: Chatroom[], joined: boolean, communityId?: string, roomId?: string) {
  const linkedCommunityId = communityId ?? rooms.find((r) => r.id === roomId)?.communityId;
  const linkedRoomIds = new Set(
    rooms.filter((r) => r.id === roomId || (linkedCommunityId && r.communityId === linkedCommunityId)).map((r) => r.id),
  );
  return {
    communities: communities.map((c) => {
      if (!linkedCommunityId || c.id !== linkedCommunityId || c.joined === joined) return c;
      return { ...c, joined, memberCount: Math.max(0, c.memberCount + (joined ? 1 : -1)) };
    }),
    rooms: rooms.map((r) => {
      if (!linkedRoomIds.has(r.id) || r.joined === joined) return r;
      return { ...r, joined, memberCount: Math.max(0, r.memberCount + (joined ? 1 : -1)), unread: joined ? r.unread : 0 };
    }),
  };
}

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

type CommunityState = {
  communities: Community[];
  rooms: Chatroom[];
  messages: ChatMessage[];
  typingRoomId: string | null;
  events: GameEvent[];
  demos: Demo[];
  reviews: Review[];
  comments: DemoComment[];
  people: PersonCard[];
  teams: TeamRequest[];
  notes: NotificationItem[];
  slots: Record<string, ExpertSlot[]>;
  myReviewIds: Record<string, string>;
  appliedTeams: string[];
  isExpert: boolean;
  toggleRsvp: (id: string, status?: RsvpStatus) => void;
  joinCommunity: (id: string) => void;
  leaveCommunity: (id: string) => void;
  joinRoom: (id: string) => void;
  createRoom: (room: Omit<Chatroom, 'id' | 'unread' | 'joined' | 'memberCount' | 'lastMessage'> & { isPrivate?: boolean }) => string;
  sendMessage: (
    roomId: string,
    content: string,
    senderName: string,
    extra?: {
      kind?: ChatMessage['kind'];
      gifUri?: string;
      voiceDurationSec?: number;
      forwarded?: boolean;
      replyTo?: ChatMessage['replyTo'];
    },
  ) => string;
  reactToMessage: (id: string, emoji: string, userName: string) => void;
  toggleStarMessage: (id: string) => void;
  togglePinMessage: (id: string) => void;
  addComment: (demoId: string, userName: string, text: string, avatarId?: string) => void;
  retryMessage: (id: string) => void;
  setTyping: (roomId: string | null) => void;
  createEvent: (event: Omit<GameEvent, 'id' | 'attendeeCount' | 'rsvp' | 'posterName'>, posterName: string) => string;
  addDemo: (demo: Demo) => void;
  addReview: (demoId: string, reviewer: string, scores: RubricScores, comment: string) => void;
  connectPerson: (id: string) => void;
  applyTeam: (id: string) => void;
  postTeam: (req: Omit<TeamRequest, 'id'>) => void;
  markNoteRead: (id: string) => void;
  markAllRead: () => void;
  bookSlot: (expertId: string, day: string, time: string) => Promise<'ok' | 'conflict'>;
  becomeExpert: () => void;
  leaveRoom: (id: string) => void;
  toggleMute: (id: string) => void;
  togglePin: (id: string) => void;
  loadOlderMessages: (roomId: string) => void;
  retryFailedMessages: () => void;
  editMessage: (id: string, content: string) => void;
  deleteMessage: (id: string) => void;
  confirmEventPayment: (id: string) => void;
};

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: seedCommunities,
  rooms: seedRooms,
  messages: seedMessages,
  typingRoomId: null,
  events: seedEvents,
  demos: seedDemos,
  reviews: seedReviews,
  comments: seedComments,
  people: seedPeople,
  teams: seedTeams,
  notes: seedNotes,
  slots: seedSlots,
  myReviewIds: {},
  appliedTeams: [],
  isExpert: false,
  toggleRsvp: (id, status) =>
    set((s) => ({
      events: s.events.map((e) => {
        if (e.id !== id) return e;
        const next: RsvpStatus = status ?? (e.rsvp === 'going' ? null : 'going');
        const delta = e.rsvp === 'going' && next !== 'going' ? -1 : e.rsvp !== 'going' && next === 'going' ? 1 : 0;
        return { ...e, rsvp: next, attendeeCount: e.attendeeCount + delta };
      }),
    })),
  joinCommunity: (id) => set((s) => applyMembership(s.communities, s.rooms, true, id)),
  leaveCommunity: (id) => set((s) => applyMembership(s.communities, s.rooms, false, id)),
  joinRoom: (id) => set((s) => applyMembership(s.communities, s.rooms, true, undefined, id)),
  leaveRoom: (id) =>
    set((s) => {
      const room = s.rooms.find((r) => r.id === id);
      if (room?.kind === 'global') return s;
      return applyMembership(s.communities, s.rooms, false, undefined, id);
    }),
  toggleMute: (id) => set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, muted: !r.muted } : r)) })),
  togglePin: (id) => set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, pinned: !r.pinned } : r)) })),
  loadOlderMessages: (roomId) =>
    set((s) => {
      const existing = s.messages.filter((m) => m.roomId === roomId);
      if (existing.length > 12) return s;
      const older: ChatMessage = {
        id: `m-old-${roomId}-${Date.now()}`,
        roomId,
        senderId: 'u2',
        senderName: 'Mira',
        content: 'Earlier: bringing a clip from last night’s ranked.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'sent',
      };
      return { messages: [older, ...s.messages] };
    }),
  createRoom: (room) => {
    const id = `r${Date.now()}`;
    set((s) => ({
      rooms: [
        {
          ...room,
          id,
          unread: 0,
          joined: true,
          memberCount: 1,
          lastMessage: 'Room created',
          isPrivate: room.isPrivate ?? false,
        },
        ...s.rooms,
      ],
    }));
    return id;
  },
  sendMessage: (roomId, content, senderName, extra) => {
    const id = `m${Date.now()}`;
    const kind = extra?.kind ?? 'text';
    const preview = kind === 'gif' ? 'GIF' : kind === 'voice' ? `Voice · ${extra?.voiceDurationSec ?? 1}s` : content;
    const msg: ChatMessage = {
      id,
      roomId,
      senderId: 'u1',
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
    set((s) => ({
      messages: [...s.messages, msg],
      rooms: s.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const streak =
          r.kind === 'dm' ? nextStreak(r.lastChatAt, r.streakCount) : r.streakCount;
        return {
          ...r,
          lastMessage: preview,
          unread: 0,
          lastChatAt: r.kind === 'dm' ? new Date().toISOString() : r.lastChatAt,
          streakCount: streak,
        };
      }),
    }));
    const fail = content.toLowerCase().includes('fail');
    setTimeout(() => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === id
            ? {
                ...m,
                status: fail ? 'failed' : 'sent',
                receipts: fail
                  ? m.receipts
                  : [
                      { userId: 'u4', name: 'Mira Chen', avatarId: 'neon-fox', deliveredAt: new Date().toISOString() },
                      { userId: 'u2', name: 'Alex', avatarId: 'cyber-wolf', deliveredAt: new Date().toISOString() },
                      { userId: 'u5', name: 'Nova', avatarId: 'astro-gamer', deliveredAt: new Date().toISOString() },
                    ],
              }
            : m,
        ),
      }));
    }, 500);
    setTimeout(() => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === id && m.receipts
            ? {
                ...m,
                receipts: m.receipts.map((r, i) => (i < 2 ? { ...r, readAt: new Date().toISOString() } : r)),
              }
            : m,
        ),
      }));
    }, 1400);
    return id;
  },
  retryMessage: (id) => {
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'sending' } : m)) }));
    setTimeout(() => {
      set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'sent' } : m)) }));
    }, 400);
  },
  retryFailedMessages: () => {
    const failed = get().messages.filter((m) => m.status === 'failed');
    failed.forEach((m) => get().retryMessage(m.id));
  },
  editMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id && !m.deleted ? { ...m, content, edited: true } : m,
      ),
    })),
  deleteMessage: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, deleted: true, content: 'This message was deleted' } : m,
      ),
    })),
  reactToMessage: (id, emoji, userName) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== id) return m;
        const reactions = [...(m.reactions ?? [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          reactions.push({ emoji, users: [userName] });
        } else {
          const users = reactions[idx].users.includes(userName)
            ? reactions[idx].users.filter((u) => u !== userName)
            : [...reactions[idx].users, userName];
          if (users.length === 0) reactions.splice(idx, 1);
          else reactions[idx] = { emoji, users };
        }
        return { ...m, reactions };
      }),
    })),
  toggleStarMessage: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)) })),
  togglePinMessage: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),
  confirmEventPayment: (id) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.id === id
          ? {
              ...e,
              paidByUser: true,
              rsvp: 'going',
              attendeeCount: e.rsvp === 'going' ? e.attendeeCount : e.attendeeCount + 1,
            }
          : e,
      ),
    })),
  setTyping: (roomId) => set({ typingRoomId: roomId }),
  createEvent: (event, posterName) => {
    const id = `e${Date.now()}`;
    set((s) => ({
      events: [{ ...event, id, posterName, attendeeCount: 1, rsvp: 'going' }, ...s.events],
    }));
    return id;
  },
  addDemo: (demo) => set((s) => ({ demos: [demo, ...s.demos] })),
  addReview: (demoId, reviewer, scores, comment) => {
    set((s) => {
      const existingId = s.myReviewIds[demoId];
      if (existingId) {
        const prev = s.reviews.find((r) => r.id === existingId);
        return {
          reviews: s.reviews.map((r) =>
            r.id === existingId ? { ...r, scores, comment, createdAt: new Date().toISOString() } : r,
          ),
          demos: s.demos.map((d) => {
            if (d.id !== demoId || !prev) return d;
            const n = Math.max(1, d.reviewCount);
            const avg = (k: keyof RubricScores) => (d.scores[k] * n - prev.scores[k] + scores[k]) / n;
            return {
              ...d,
              scores: { gameplay: avg('gameplay'), art: avg('art'), concept: avg('concept'), polish: avg('polish') },
            };
          }),
        };
      }
      const id = `rv${Date.now()}`;
      return {
        reviews: [{ id, demoId, reviewer, scores, comment, createdAt: new Date().toISOString() }, ...s.reviews],
        myReviewIds: { ...s.myReviewIds, [demoId]: id },
        demos: s.demos.map((d) => {
          if (d.id !== demoId) return d;
          const n = d.reviewCount;
          const avg = (k: keyof RubricScores) => (d.scores[k] * n + scores[k]) / (n + 1);
          return {
            ...d,
            reviewCount: n + 1,
            scores: { gameplay: avg('gameplay'), art: avg('art'), concept: avg('concept'), polish: avg('polish') },
          };
        }),
      };
    });
  },
  addComment: (demoId, userName, text, avatarId) =>
    set((s) => ({
      comments: [
        {
          id: `dc${Date.now()}`,
          demoId,
          userId: 'u1',
          userName,
          avatarId,
          text,
          createdAt: new Date().toISOString(),
          likes: 0,
        },
        ...s.comments,
      ],
    })),
  connectPerson: (id) =>
    set((s) => ({
      people: s.people.map((p) => {
        if (p.id !== id) return p;
        if (p.connect === 'connect') return { ...p, connect: 'pending' };
        if (p.connect === 'pending') return { ...p, connect: 'connected' };
        return p;
      }),
    })),
  applyTeam: (id) => set((s) => ({ appliedTeams: [...s.appliedTeams, id] })),
  postTeam: (req) => set((s) => ({ teams: [{ ...req, id: `t${Date.now()}` }, ...s.teams] })),
  markNoteRead: (id) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ notes: s.notes.map((n) => ({ ...n, read: true })) })),
  bookSlot: async (expertId, day, time) => {
    await delay(350);
    let conflict = false;
    set((s) => {
      const existing = s.slots[expertId] ?? [];
      const hit = existing.find((sl) => sl.day === day && sl.time === time);
      if (hit && !hit.available) {
        conflict = true;
        return s;
      }
      return {
        slots: {
          ...s.slots,
          [expertId]: [...existing.filter((sl) => !(sl.day === day && sl.time === time)), { day, time, available: false }],
        },
      };
    });
    return conflict ? 'conflict' : 'ok';
  },
  becomeExpert: () => set({ isExpert: true }),
}));
