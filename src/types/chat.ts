import type { ImageSourcePropType } from 'react-native';

export type Chatroom = {
  id: string;
  name: string;
  tag: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  lastMessageAt?: string;
  unread: number;
  joined: boolean;
  kind?: 'room' | 'dm' | 'server' | 'global';
  serverRegion?: string;
  streakCount?: number;
  lastChatAt?: string;
  peerId?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  /** True once the viewer has an outstanding (unresponded) join request for this room —
   * tapping it should show that status instead of re-prompting to join. */
  joinRequestPending?: boolean;
  pinned?: boolean;
  muted?: boolean;
  avatar?: string;
  /** DM only: the other person's preset avatar id (used when they have no uploaded photo). */
  avatarId?: string;
  communityId?: string;
  logo?: ImageSourcePropType;
  createdBy?: string;
  myRole?: 'owner' | 'admin' | 'member';
};

export type RoomMember = {
  userId: string;
  name: string;
  avatarUri?: string;
  avatarId?: string;
  role: 'owner' | 'admin' | 'member';
};

export type RoomInvite = {
  id: string;
  chatroomId: string;
  roomName: string;
  inviterId: string;
  inviterName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type RoomJoinRequest = {
  id: string;
  chatroomId: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUri?: string;
  requesterAvatarId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderAvatarId?: string;
  content: string;
  createdAt: string;
  status: 'sent' | 'sending' | 'failed';
  mine?: boolean;
  edited?: boolean;
  deleted?: boolean;
  kind?: 'text' | 'gif' | 'voice' | 'image' | 'video' | 'sticker';
  gifUri?: string;
  voiceDurationSec?: number;
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
  reactions?: { emoji: string; count: number; mine: boolean }[];
  starred?: boolean;
  pinned?: boolean;
  forwarded?: boolean;
  replyTo?: { id: string; senderName: string; content: string };
  receipts?: { userId: string; name: string; avatarId?: string; deliveredAt: string; readAt?: string }[];
};
