import type { PostKind } from '../services/supabase/types';

export type { PostKind };

export interface FeedPost {
  id: string;
  userId: string;
  authorName: string;
  authorAvatarUri?: string;
  authorAvatarId?: string;
  kind: PostKind;
  content: string;
  activityTag?: string;
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
  createdAt: string;
  reactions?: { emoji: string; count: number; mine: boolean }[];
  commentCount: number;
  mine: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  avatarId?: string;
  avatarUri?: string;
  text: string;
  createdAt: string;
}
