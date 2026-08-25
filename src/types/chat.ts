import type { ImageSourcePropType } from 'react-native';

export type Chatroom = {
  id: string;
  name: string;
  tag: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  unread: number;
  joined: boolean;
  kind?: 'room' | 'dm' | 'server' | 'global';
  serverRegion?: string;
  streakCount?: number;
  lastChatAt?: string;
  peerId?: string;
  isPrivate?: boolean;
  pinned?: boolean;
  muted?: boolean;
  avatar?: string;
  communityId?: string;
  logo?: ImageSourcePropType;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  status: 'sent' | 'sending' | 'failed';
  mine?: boolean;
  edited?: boolean;
  deleted?: boolean;
  kind?: 'text' | 'gif' | 'voice';
  gifUri?: string;
  voiceDurationSec?: number;
  reactions?: { emoji: string; users: string[] }[];
  starred?: boolean;
  pinned?: boolean;
  forwarded?: boolean;
  replyTo?: { id: string; senderName: string; content: string };
  receipts?: { userId: string; name: string; avatarId?: string; deliveredAt: string; readAt?: string }[];
};
