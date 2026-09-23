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
  /** The comment this one is replying to, if any — a flat pointer, not a nested tree. The
   * replied-to name is resolved client-side from whatever's already loaded (see
   * PostCommentsSheet), not carried on this row, so a reply to a comment outside the current
   * page just shows with no tag rather than needing another round trip. */
  parentId?: string;
}
