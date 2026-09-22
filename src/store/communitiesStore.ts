import { create } from 'zustand';
import { reconcile, swr, type FetchOpts } from './swr';
import * as communitiesApi from '../services/supabase/communities';
import * as chatApi from '../services/supabase/chat';
import { deleteObjectByPublicUrl } from '../services/supabase/storage';
import { captureException } from '../services/analytics/analytics';
import type { Community } from '../types/community';

type CommunitiesState = {
  communities: Community[];
  communitiesHasMore: boolean;
  loading: boolean;
  error: string | null;
  fetchCommunities: (userId: string, opts?: FetchOpts) => Promise<void>;
  loadMoreCommunities: (userId: string) => Promise<void>;
  /** Server-side search results for the Communities screen — kept apart from `communities` so a
   * search never replaces the list other screens (Home) show. */
  searchResults: Community[];
  /** The query `searchResults` answers; the screen falls back to local filtering until it matches. */
  searchedQuery: string;
  searchCommunities: (userId: string, query: string) => Promise<void>;
  joinCommunity: (userId: string, communityId: string) => Promise<void>;
  leaveCommunity: (userId: string, communityId: string) => Promise<void>;
  createCommunity: (input: { createdBy: string; shortName: string; name: string; description: string; location?: string; logoUrl?: string; tags?: string[]; rules?: string }) => Promise<Community>;
  updateCommunity: (id: string, patch: { name?: string; description?: string; location?: string; logoUrl?: string; tags?: string[] }) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
};

let searchSeq = 0;

const findCommunity = (s: CommunitiesState, id: string) => s.communities.find((c) => c.id === id) ?? s.searchResults.find((c) => c.id === id);

/** Apply a change to one community in BOTH the main list and the search results, so joining a
 * community you found via search updates it everywhere. */
const patchCommunity = (s: CommunitiesState, id: string, fn: (c: Community) => Community) => ({
  communities: s.communities.map((c) => (c.id === id ? fn(c) : c)),
  searchResults: s.searchResults.map((c) => (c.id === id ? fn(c) : c)),
});

export const useCommunitiesStore = create<CommunitiesState>((set, get) => ({
  communities: [],
  communitiesHasMore: false,
  loading: false,
  error: null,
  searchResults: [],
  searchedQuery: '',

  fetchCommunities: (userId, opts) =>
    swr(
      `communities:${userId}`,
      async () => {
        set((s) => ({ loading: s.communities.length === 0, error: null }));
        try {
          const { rows, hasMore } = await communitiesApi.listCommunities(userId, 0);
          set((s) => ({ communities: reconcile(s.communities, rows), communitiesHasMore: hasMore, loading: false }));
          return true;
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : 'Could not load communities' });
          return false;
        }
      },
      opts,
    ),

  loadMoreCommunities: async (userId) => {
    try {
      const { rows, hasMore } = await communitiesApi.listCommunities(userId, get().communities.length);
      set((s) => ({ communities: [...s.communities, ...rows], communitiesHasMore: hasMore }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load more communities' });
    }
  },

  searchCommunities: async (userId, query) => {
    const needle = query.trim().toLowerCase();
    const seq = ++searchSeq;
    if (!needle) {
      set({ searchResults: [], searchedQuery: '' });
      return;
    }
    try {
      const results = await communitiesApi.searchCommunities(userId, needle);
      // A newer keystroke may already have started another search — only the latest one wins.
      if (seq === searchSeq) set({ searchResults: results, searchedQuery: needle });
    } catch (err) {
      captureException(err);
    }
  },

  joinCommunity: async (userId, communityId) => {
    const prev = findCommunity(get(), communityId);
    set((s) => patchCommunity(s, communityId, (c) => ({ ...c, joined: true, memberCount: c.memberCount + 1 })));
    try {
      await communitiesApi.joinCommunity(userId, communityId);
    } catch (err) {
      if (prev) set((s) => patchCommunity(s, communityId, () => prev));
      captureException(err);
      throw err;
    }
  },

  leaveCommunity: async (userId, communityId) => {
    const prev = findCommunity(get(), communityId);
    set((s) => patchCommunity(s, communityId, (c) => ({ ...c, joined: false, memberCount: Math.max(0, c.memberCount - 1) })));
    try {
      await communitiesApi.leaveCommunity(userId, communityId);
    } catch (err) {
      if (prev) set((s) => patchCommunity(s, communityId, () => prev));
      captureException(err);
      throw err;
    }
  },

  createCommunity: async (input) => {
    try {
      const community = await communitiesApi.createCommunity(input);
      await communitiesApi.joinCommunity(input.createdBy, community.id);
      // createCommunity only inserts the communities row — without this, "Open chatroom" on
      // CommunityDetailScreen has nowhere to go (no chatrooms.community_id row ever exists).
      await chatApi.createRoom({
        name: community.name,
        description: community.description,
        tag: community.shortName,
        community_id: community.id,
        is_private: false,
        created_by: input.createdBy,
      });
      const joined = { ...community, joined: true, memberCount: 1 };
      set((s) => ({ communities: [joined, ...s.communities] }));
      return joined;
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  updateCommunity: async (id, patch) => {
    const prev = get().communities.find((c) => c.id === id);
    try {
      const updated = await communitiesApi.updateCommunity(id, patch);
      set((s) => ({
        communities: s.communities.map((c) =>
          c.id === id ? { ...c, name: updated.name, description: updated.description, location: updated.location, logo: updated.logo, logoUrl: updated.logoUrl, tags: updated.tags } : c,
        ),
      }));
    } catch (err) {
      if (prev) set((s) => ({ communities: s.communities.map((c) => (c.id === id ? prev : c)) }));
      captureException(err);
      throw err;
    }
  },

  deleteCommunity: async (id) => {
    const community = get().communities.find((c) => c.id === id);
    try {
      await communitiesApi.deleteCommunity(id);
      set((s) => ({ communities: s.communities.filter((c) => c.id !== id) }));
    } catch (err) {
      captureException(err);
      throw err;
    }
    if (community?.logoUrl) {
      deleteObjectByPublicUrl('community-logos', community.logoUrl).catch(() => undefined);
    }
  },
}));
