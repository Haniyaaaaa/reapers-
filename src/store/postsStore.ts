import { create } from 'zustand';
import { reconcile, swr, type FetchOpts } from './swr';
import * as postsApi from '../services/supabase/posts';
import { captureException } from '../services/analytics/analytics';
import { playSound } from '../services/sound';
import type { FeedPost, PostComment, PostKind } from '../types/post';

type PostsState = {
  posts: FeedPost[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;

  // Cursor for the "New posts" banner — the newest created_at we've actually rendered.
  newestKnownCreatedAt: string | null;
  newPostsAvailable: boolean;

  comments: Record<string, PostComment[]>;
  commentsHasMore: Record<string, boolean>;
  commentsLoading: Record<string, boolean>;

  // "My Posts" screen — a separate list/cursor from the global feed above, since it's scoped
  // to one author and paginated independently.
  myPosts: FeedPost[];
  myPostsHasMore: boolean;
  myPostsLoading: boolean;
  fetchMyPosts: (userId: string) => Promise<void>;
  loadMoreMyPosts: (userId: string) => Promise<void>;

  fetchFeed: (myUserId: string, opts?: FetchOpts) => Promise<void>;
  loadMorePosts: (myUserId: string) => Promise<void>;
  checkForNewPosts: () => Promise<void>;
  loadNewPosts: (myUserId: string) => Promise<void>;
  createPost: (input: { userId: string; kind: PostKind; content: string; activityTag?: string; mediaUrl?: string; mediaThumbnailUrl?: string }) => Promise<FeedPost | null>;
  deletePost: (id: string, userId: string) => Promise<void>;
  editPost: (id: string, userId: string, content: string) => Promise<void>;
  adminDeletePost: (id: string, adminId: string) => Promise<void>;
  reactToPost: (postId: string, emoji: string, userId: string) => Promise<void>;

  fetchComments: (postId: string) => Promise<void>;
  loadMoreComments: (postId: string) => Promise<void>;
  addComment: (postId: string, userId: string, text: string, parentId?: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string, userId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, userId: string, text: string) => Promise<void>;
  handleRealtimeComment: (row: { id: string; post_id: string; user_id: string; text: string; created_at: string; parent_id?: string | null }) => void;
};

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  hasMore: false,
  loading: false,
  error: null,

  newestKnownCreatedAt: null,
  newPostsAvailable: false,

  comments: {},
  commentsHasMore: {},
  commentsLoading: {},

  myPosts: [],
  myPostsHasMore: false,
  myPostsLoading: false,

  fetchMyPosts: async (userId) => {
    set({ myPostsLoading: true });
    try {
      const { rows, hasMore } = await postsApi.listMyPosts(userId);
      set({ myPosts: rows, myPostsHasMore: hasMore, myPostsLoading: false });
    } catch (err) {
      captureException(err);
      set({ myPostsLoading: false });
    }
  },

  loadMoreMyPosts: async (userId) => {
    const { myPosts, myPostsHasMore, myPostsLoading } = get();
    if (!myPostsHasMore || myPostsLoading || myPosts.length === 0) return;
    set({ myPostsLoading: true });
    try {
      const { rows, hasMore } = await postsApi.listMyPosts(userId, { before: myPosts[myPosts.length - 1].createdAt });
      set({ myPosts: [...myPosts, ...rows], myPostsHasMore: hasMore, myPostsLoading: false });
    } catch (err) {
      captureException(err);
      set({ myPostsLoading: false });
    }
  },

  fetchFeed: (myUserId, opts) =>
    swr(
      `feed:${myUserId}`,
      async () => {
        set((s) => ({ loading: s.posts.length === 0, error: null }));
        try {
          const { rows, hasMore } = await postsApi.listFeed(myUserId);
          set((s) => ({ posts: reconcile(s.posts, rows), hasMore, loading: false, newestKnownCreatedAt: rows[0]?.createdAt ?? s.newestKnownCreatedAt, newPostsAvailable: false }));
          return true;
        } catch (err) {
          captureException(err);
          set({ loading: false, error: err instanceof Error ? err.message : 'Could not load feed' });
          return false;
        }
      },
      opts,
    ),

  loadMorePosts: async (myUserId) => {
    const { posts, hasMore, loading } = get();
    if (!hasMore || loading || posts.length === 0) return;
    set({ loading: true });
    try {
      const { rows, hasMore: more } = await postsApi.listFeed(myUserId, { before: posts[posts.length - 1].createdAt });
      set({ posts: [...posts, ...rows], hasMore: more, loading: false });
    } catch (err) {
      captureException(err);
      set({ loading: false });
    }
  },

  // Called from a realtime INSERT handler — deliberately does not fetch or prepend anything
  // itself, just flags the banner. Keeps the feed list stable while someone is reading it.
  checkForNewPosts: async () => {
    const since = get().newestKnownCreatedAt;
    if (!since) return;
    try {
      const count = await postsApi.countNewerPosts(since);
      if (count > 0) set({ newPostsAvailable: true });
    } catch (err) {
      captureException(err);
    }
  },

  loadNewPosts: async (myUserId) => {
    const since = get().newestKnownCreatedAt;
    if (!since) return;
    try {
      const rows = await postsApi.loadNewest(myUserId, since);
      set((s) => ({
        posts: [...rows, ...s.posts],
        newestKnownCreatedAt: rows[0]?.createdAt ?? s.newestKnownCreatedAt,
        newPostsAvailable: false,
      }));
    } catch (err) {
      captureException(err);
    }
  },

  createPost: async (input) => {
    try {
      const post = await postsApi.createPost(input);
      set((s) => ({ posts: [post, ...s.posts], newestKnownCreatedAt: post.createdAt }));
      playSound('success');
      return post;
    } catch (err) {
      captureException(err);
      set({ error: err instanceof Error ? err.message : 'Could not create post' });
      return null;
    }
  },

  deletePost: async (id, userId) => {
    const prev = get().posts;
    const prevMine = get().myPosts;
    set({ posts: prev.filter((p) => p.id !== id), myPosts: prevMine.filter((p) => p.id !== id) });
    try {
      await postsApi.deletePost(id, userId);
    } catch (err) {
      set({ posts: prev, myPosts: prevMine });
      captureException(err);
    }
  },

  editPost: async (id, userId, content) => {
    const prev = get().posts;
    const prevMine = get().myPosts;
    set({
      posts: prev.map((p) => (p.id === id ? { ...p, content } : p)),
      myPosts: prevMine.map((p) => (p.id === id ? { ...p, content } : p)),
    });
    try {
      await postsApi.updatePost(id, userId, content);
    } catch (err) {
      set({ posts: prev, myPosts: prevMine });
      captureException(err);
      throw err;
    }
  },

  adminDeletePost: async (id, adminId) => {
    const prev = get().posts;
    set({ posts: prev.filter((p) => p.id !== id) });
    try {
      await postsApi.adminSoftDeletePost(id, adminId);
    } catch (err) {
      set({ posts: prev });
      captureException(err);
    }
  },

  // Optimistic toggle then persist, rollback on failure — line-for-line the same shape as
  // chatStore.reactToMessage, retargeted from messages to posts.
  reactToPost: async (postId, emoji, userId) => {
    const prevPost = get().posts.find((p) => p.id === postId);
    const existing = prevPost?.reactions?.find((r) => r.emoji === emoji);
    const mine = existing?.mine ?? false;
    set((s) => ({
      posts: s.posts.map((p) => {
        if (p.id !== postId) return p;
        const reactions = [...(p.reactions ?? [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) reactions.push({ emoji, count: 1, mine: true });
        else if (mine) {
          if (reactions[idx].count <= 1) reactions.splice(idx, 1);
          else reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, mine: false };
        } else reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, mine: true };
        return { ...p, reactions };
      }),
    }));
    if (!mine) playSound('like');
    try {
      await postsApi.toggleReaction(postId, userId, emoji, mine);
    } catch (err) {
      if (prevPost) set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? prevPost : p)) }));
      captureException(err);
    }
  },

  fetchComments: async (postId) => {
    set((s) => ({ commentsLoading: { ...s.commentsLoading, [postId]: true } }));
    try {
      const { rows, hasMore } = await postsApi.listComments(postId);
      set((s) => ({
        comments: { ...s.comments, [postId]: rows },
        commentsHasMore: { ...s.commentsHasMore, [postId]: hasMore },
        commentsLoading: { ...s.commentsLoading, [postId]: false },
      }));
    } catch (err) {
      captureException(err);
      set((s) => ({ commentsLoading: { ...s.commentsLoading, [postId]: false } }));
    }
  },

  loadMoreComments: async (postId) => {
    const existing = get().comments[postId] ?? [];
    if (!get().commentsHasMore[postId] || existing.length === 0) return;
    try {
      const { rows, hasMore } = await postsApi.listComments(postId, { before: existing[existing.length - 1].createdAt });
      set((s) => ({
        comments: { ...s.comments, [postId]: [...existing, ...rows] },
        commentsHasMore: { ...s.commentsHasMore, [postId]: hasMore },
      }));
    } catch (err) {
      captureException(err);
    }
  },

  addComment: async (postId, userId, text, parentId) => {
    try {
      const comment = await postsApi.addComment(postId, userId, text, parentId);
      set((s) => ({
        comments: { ...s.comments, [postId]: [comment, ...(s.comments[postId] ?? [])] },
        posts: s.posts.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
      }));
    } catch (err) {
      captureException(err);
      throw err; // the comments screen restores the typed text on failure
    }
  },

  editComment: async (postId, commentId, userId, text) => {
    const prev = get().comments[postId] ?? [];
    set((s) => ({ comments: { ...s.comments, [postId]: prev.map((c) => (c.id === commentId ? { ...c, text } : c)) } }));
    try {
      await postsApi.updateComment(commentId, userId, text);
    } catch (err) {
      set((s) => ({ comments: { ...s.comments, [postId]: prev } }));
      captureException(err);
      throw err;
    }
  },

  deleteComment: async (postId, commentId, userId) => {
    const prevComments = get().comments[postId] ?? [];
    const prevPosts = get().posts;
    set((s) => ({
      comments: { ...s.comments, [postId]: prevComments.filter((c) => c.id !== commentId) },
      posts: s.posts.map((p) => (p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)),
    }));
    try {
      await postsApi.deleteComment(commentId, userId);
    } catch (err) {
      set({ comments: { ...get().comments, [postId]: prevComments }, posts: prevPosts });
      captureException(err);
    }
  },

  // Realtime INSERT for the single-post comments screen — a genuinely new comment from someone
  // else while this one post is open. Skips duplicating a comment this same client just added
  // optimistically via addComment.
  handleRealtimeComment: (row) => {
    set((s) => {
      const existing = s.comments[row.post_id] ?? [];
      if (existing.some((c) => c.id === row.id)) return s;
      const comment: PostComment = { id: row.id, postId: row.post_id, userId: row.user_id, userName: 'Someone', text: row.text, createdAt: row.created_at, parentId: row.parent_id ?? undefined };
      return {
        comments: { ...s.comments, [row.post_id]: [comment, ...existing] },
        posts: s.posts.map((p) => (p.id === row.post_id ? { ...p, commentCount: p.commentCount + 1 } : p)),
      };
    });
  },
}));
