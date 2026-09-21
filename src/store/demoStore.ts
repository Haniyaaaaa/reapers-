import { create } from 'zustand';
import { reconcile, swr, type FetchOpts } from './swr';
import * as demosApi from '../services/supabase/demos';
import { deleteObjectByPublicUrl } from '../services/supabase/storage';
import { captureException, track } from '../services/analytics/analytics';
import type { DemoReviewRow } from '../services/supabase/types';
import type { Demo, RubricScores } from '../types/demo';
import type { DemoComment, Review } from '../types/extra';

type DemoFilter = demosApi.DemoFilters;

type DemoState = {
  demos: Demo[];
  demosHasMore: boolean;
  demosFilter: DemoFilter;
  loading: boolean;
  error: string | null;
  comments: Record<string, DemoComment[]>;
  commentsLoading: Record<string, boolean>;
  myReviews: Record<string, DemoReviewRow | null>;
  reviews: Record<string, Review[]>;
  bookmarkedIds: Set<string>;
  bookmarksLoaded: boolean;
  fetchDemos: (filter?: DemoFilter, opts?: FetchOpts) => Promise<void>;
  loadMoreDemos: () => Promise<void>;
  fetchDemosByDeveloper: (developerId: string) => Promise<void>;
  createDemo: (input: {
    developerId: string;
    title: string;
    genre: string;
    description: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    durationSec: number;
    externalUrl?: string;
    isJamEntry?: boolean;
    screenshotUrls?: string[];
    tags?: string[];
    platforms?: string[];
    portfolioUrl?: string;
    pressKitUrl?: string;
  }) => Promise<Demo>;
  fetchComments: (demoId: string) => Promise<void>;
  addComment: (demoId: string, userId: string, text: string) => Promise<void>;
  deleteComment: (demoId: string, commentId: string, userId: string) => Promise<void>;
  fetchMyReview: (demoId: string, userId: string) => Promise<void>;
  submitReview: (demoId: string, userId: string, scores: RubricScores, comment: string) => Promise<void>;
  deleteReview: (demoId: string, userId: string) => Promise<void>;
  updateDemo: (
    id: string,
    patch: {
      title?: string;
      description?: string;
      genre?: string;
      externalUrl?: string | null;
      screenshotUrls?: string[];
      videoUrl?: string | null;
      thumbnailUrl?: string | null;
      durationSec?: number;
      tags?: string[];
      platforms?: string[];
      portfolioUrl?: string | null;
      pressKitUrl?: string | null;
    },
  ) => Promise<void>;
  deleteDemo: (id: string) => Promise<void>;

  fetchReviews: (demoId: string, myUserId?: string) => Promise<void>;
  voteOnReview: (reviewId: string, demoId: string, vote: 1 | -1 | null, myUserId: string) => Promise<void>;
  ensureBookmarksLoaded: (userId: string) => Promise<void>;
  toggleBookmark: (demoId: string, userId: string) => Promise<void>;
  incrementPlayCount: (demoId: string) => Promise<void>;
};

function upsertDemo(demos: Demo[], demo: Demo): Demo[] {
  const idx = demos.findIndex((d) => d.id === demo.id);
  if (idx === -1) return [demo, ...demos];
  const next = [...demos];
  next[idx] = demo;
  return next;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  demos: [],
  demosHasMore: false,
  demosFilter: {},
  loading: false,
  error: null,
  comments: {},
  commentsLoading: {},
  myReviews: {},
  reviews: {},
  bookmarkedIds: new Set(),
  bookmarksLoaded: false,

  fetchDemos: (filter = {}, opts) =>
    swr(
      `demos:${JSON.stringify(filter)}`,
      async () => {
        // A different filter is a different list, so show loading for it; a plain refresh stays visible.
        set((s) => ({ loading: s.demos.length === 0 || JSON.stringify(s.demosFilter) !== JSON.stringify(filter), error: null, demosFilter: filter }));
        try {
          const { rows, hasMore } = await demosApi.listDemos(0, undefined, filter);
          set((s) => ({ demos: reconcile(s.demos, rows), demosHasMore: hasMore, loading: false }));
          return true;
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : 'Could not load demos' });
          return false;
        }
      },
      opts,
    ),

  loadMoreDemos: async () => {
    try {
      const { rows, hasMore } = await demosApi.listDemos(get().demos.length, undefined, get().demosFilter);
      set((s) => ({ demos: [...s.demos, ...rows], demosHasMore: hasMore }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load more demos' });
    }
  },

  fetchDemosByDeveloper: async (developerId) => {
    try {
      const rows = await demosApi.listDemosByDeveloper(developerId);
      set((s) => ({ demos: rows.reduce(upsertDemo, s.demos) }));
    } catch (err) {
      // Portfolio section degrades to whatever's already cached; the profile screen itself
      // isn't blocked on this secondary fetch.
      captureException(err);
    }
  },

  createDemo: async (input) => {
    try {
      const demo = await demosApi.createDemo({
        developer_id: input.developerId,
        title: input.title,
        genre: input.genre,
        description: input.description,
        thumbnail_url: input.thumbnailUrl,
        video_url: input.videoUrl,
        duration_sec: input.durationSec,
        external_url: input.externalUrl,
        is_jam_entry: input.isJamEntry,
        screenshot_urls: input.screenshotUrls,
        tags: input.tags,
        platforms: input.platforms,
        portfolio_url: input.portfolioUrl,
        press_kit_url: input.pressKitUrl,
      });
      set((s) => ({ demos: [demo, ...s.demos] }));
      track('demo_uploaded', { genre: input.genre });
      return demo;
    } catch (err) {
      captureException(err);
      throw err; // DemoUploadScreen's own try/catch shows the specific upload error
    }
  },

  fetchComments: async (demoId) => {
    set((s) => ({ commentsLoading: { ...s.commentsLoading, [demoId]: true } }));
    try {
      const comments = await demosApi.listComments(demoId);
      set((s) => ({
        comments: { ...s.comments, [demoId]: comments },
        commentsLoading: { ...s.commentsLoading, [demoId]: false },
      }));
    } catch (err) {
      captureException(err);
      set((s) => ({ commentsLoading: { ...s.commentsLoading, [demoId]: false } }));
    }
  },

  addComment: async (demoId, userId, text) => {
    try {
      await demosApi.addComment(demoId, userId, text);
      await get().fetchComments(demoId);
    } catch (err) {
      captureException(err);
      throw err; // DemoDetailScreen restores the typed comment on failure
    }
  },

  deleteComment: async (demoId, commentId, userId) => {
    const prev = get().comments[demoId] ?? [];
    set((s) => ({ comments: { ...s.comments, [demoId]: prev.filter((c) => c.id !== commentId) } }));
    try {
      await demosApi.deleteComment(commentId, userId);
    } catch (err) {
      set((s) => ({ comments: { ...s.comments, [demoId]: prev } }));
      captureException(err);
    }
  },

  fetchMyReview: async (demoId, userId) => {
    try {
      const review = await demosApi.getMyReview(demoId, userId);
      set((s) => ({ myReviews: { ...s.myReviews, [demoId]: review } }));
    } catch (err) {
      // Non-fatal: the review form just starts blank instead of pre-filled.
      captureException(err);
    }
  },

  submitReview: async (demoId, userId, scores, comment) => {
    const review = await demosApi.submitReview(demoId, userId, scores, comment);
    set((s) => ({ myReviews: { ...s.myReviews, [demoId]: review } }));
    const refreshed = await demosApi.getDemo(demoId);
    if (refreshed) set((s) => ({ demos: upsertDemo(s.demos, refreshed) }));
  },

  deleteReview: async (demoId, userId) => {
    await demosApi.deleteReview(demoId, userId);
    set((s) => ({ myReviews: { ...s.myReviews, [demoId]: null } }));
    const refreshed = await demosApi.getDemo(demoId);
    if (refreshed) set((s) => ({ demos: upsertDemo(s.demos, refreshed) }));
  },

  updateDemo: async (id, patch) => {
    try {
      const demo = await demosApi.updateDemo(id, {
        title: patch.title,
        description: patch.description,
        genre: patch.genre,
        external_url: patch.externalUrl,
        screenshot_urls: patch.screenshotUrls,
        video_url: patch.videoUrl,
        thumbnail_url: patch.thumbnailUrl,
        duration_sec: patch.durationSec,
        tags: patch.tags,
        platforms: patch.platforms,
        portfolio_url: patch.portfolioUrl,
        press_kit_url: patch.pressKitUrl,
      });
      set((s) => ({ demos: upsertDemo(s.demos, demo) }));
    } catch (err) {
      captureException(err);
      throw err; // DemoDetailScreen's edit form keeps its own try/finally around this call
    }
  },

  deleteDemo: async (id) => {
    const demo = get().demos.find((d) => d.id === id);
    try {
      await demosApi.deleteDemo(id);
      set((s) => ({ demos: s.demos.filter((d) => d.id !== id) }));
    } catch (err) {
      captureException(err);
      throw err; // DemoDetailScreen's delete-confirm sheet keeps its own try/finally around this call
    }
    // Best-effort — the DB row is already gone; a storage cleanup failure here must never
    // surface as a "delete failed" error to the user.
    if (demo) {
      if (demo.videoUrl) deleteObjectByPublicUrl('demo-videos', demo.videoUrl).catch(() => undefined);
      if (demo.thumbnail) deleteObjectByPublicUrl('demo-thumbnails', demo.thumbnail).catch(() => undefined);
      for (const url of demo.screenshotUrls ?? []) {
        deleteObjectByPublicUrl('demo-screenshots', url).catch(() => undefined);
      }
    }
  },

  fetchReviews: async (demoId, myUserId) => {
    try {
      const reviews = await demosApi.listReviews(demoId, myUserId);
      set((s) => ({ reviews: { ...s.reviews, [demoId]: reviews } }));
    } catch (err) {
      captureException(err);
    }
  },

  // Optimistic toggle then persist, rollback on failure — same shape as chatStore.reactToMessage.
  voteOnReview: async (reviewId, demoId, vote, myUserId) => {
    const prev = get().reviews[demoId] ?? [];
    set((s) => ({
      reviews: {
        ...s.reviews,
        [demoId]: prev.map((r) => {
          if (r.id !== reviewId) return r;
          let upvotes = r.upvotes - (r.myVote === 1 ? 1 : 0);
          let downvotes = r.downvotes - (r.myVote === -1 ? 1 : 0);
          if (vote === 1) upvotes += 1;
          if (vote === -1) downvotes += 1;
          return { ...r, upvotes, downvotes, myVote: vote };
        }),
      },
    }));
    try {
      await demosApi.voteOnReview(reviewId, myUserId, vote);
    } catch (err) {
      set((s) => ({ reviews: { ...s.reviews, [demoId]: prev } }));
      captureException(err);
    }
  },

  ensureBookmarksLoaded: async (userId) => {
    if (get().bookmarksLoaded) return;
    try {
      const ids = await demosApi.listMyBookmarkedDemoIds(userId);
      set({ bookmarkedIds: ids, bookmarksLoaded: true });
    } catch (err) {
      captureException(err);
    }
  },

  toggleBookmark: async (demoId, userId) => {
    const prev = new Set(get().bookmarkedIds);
    const wasBookmarked = prev.has(demoId);
    const next = new Set(prev);
    if (wasBookmarked) next.delete(demoId);
    else next.add(demoId);
    set({ bookmarkedIds: next });
    try {
      await demosApi.toggleBookmark(demoId, userId, wasBookmarked);
    } catch (err) {
      set({ bookmarkedIds: prev });
      captureException(err);
    }
  },

  incrementPlayCount: async (demoId) => {
    set((s) => ({ demos: s.demos.map((d) => (d.id === demoId ? { ...d, playCount: (d.playCount ?? 0) + 1 } : d)) }));
    try {
      await demosApi.incrementPlayCount(demoId);
    } catch (err) {
      captureException(err); // best-effort — never blocks playback, no rollback needed for a cosmetic counter
    }
  },
}));
