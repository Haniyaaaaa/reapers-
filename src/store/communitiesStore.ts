import { create } from 'zustand';
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
  fetchCommunities: (userId: string) => Promise<void>;
  loadMoreCommunities: (userId: string) => Promise<void>;
  joinCommunity: (userId: string, communityId: string) => Promise<void>;
  leaveCommunity: (userId: string, communityId: string) => Promise<void>;
  createCommunity: (input: { createdBy: string; shortName: string; name: string; description: string; location?: string; logoUrl?: string }) => Promise<Community>;
  updateCommunity: (id: string, patch: { name?: string; description?: string; location?: string; logoUrl?: string }) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
};

export const useCommunitiesStore = create<CommunitiesState>((set, get) => ({
  communities: [],
  communitiesHasMore: false,
  loading: false,
  error: null,

  fetchCommunities: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { rows, hasMore } = await communitiesApi.listCommunities(userId, 0);
      set({ communities: rows, communitiesHasMore: hasMore, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Could not load communities' });
    }
  },

  loadMoreCommunities: async (userId) => {
    try {
      const { rows, hasMore } = await communitiesApi.listCommunities(userId, get().communities.length);
      set((s) => ({ communities: [...s.communities, ...rows], communitiesHasMore: hasMore }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load more communities' });
    }
  },

  joinCommunity: async (userId, communityId) => {
    const prev = get().communities.find((c) => c.id === communityId);
    set((s) => ({
      communities: s.communities.map((c) => (c.id === communityId ? { ...c, joined: true, memberCount: c.memberCount + 1 } : c)),
    }));
    try {
      await communitiesApi.joinCommunity(userId, communityId);
    } catch (err) {
      if (prev) set((s) => ({ communities: s.communities.map((c) => (c.id === communityId ? prev : c)) }));
      captureException(err);
      throw err;
    }
  },

  leaveCommunity: async (userId, communityId) => {
    const prev = get().communities.find((c) => c.id === communityId);
    set((s) => ({
      communities: s.communities.map((c) => (c.id === communityId ? { ...c, joined: false, memberCount: Math.max(0, c.memberCount - 1) } : c)),
    }));
    try {
      await communitiesApi.leaveCommunity(userId, communityId);
    } catch (err) {
      if (prev) set((s) => ({ communities: s.communities.map((c) => (c.id === communityId ? prev : c)) }));
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
          c.id === id ? { ...c, name: updated.name, description: updated.description, location: updated.location, logo: updated.logo, logoUrl: updated.logoUrl } : c,
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
