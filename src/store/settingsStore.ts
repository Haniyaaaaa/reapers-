import { create } from 'zustand';
import * as settingsApi from '../services/supabase/settings';
import { captureException } from '../services/analytics/analytics';
import type { BlockedUser } from '../services/supabase/settings';
import type { UserSettingsRow } from '../services/supabase/types';

type SettingsState = {
  settings: UserSettingsRow | null;
  blocked: BlockedUser[];
  loading: boolean;
  fetchSettings: (userId: string) => Promise<void>;
  updatePref: (userId: string, key: 'notify_chat' | 'notify_events' | 'notify_demos' | 'notify_bookings' | 'discoverable', value: boolean) => Promise<void>;
  fetchBlocked: (userId: string) => Promise<void>;
  blockUser: (userId: string, targetId: string, displayName: string) => Promise<void>;
  unblockUser: (userId: string, targetId: string) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  blocked: [],
  loading: false,

  fetchSettings: async (userId) => {
    set({ loading: true });
    try {
      const settings = await settingsApi.getSettings(userId);
      set({ settings, loading: false });
    } catch (err) {
      captureException(err);
      set({ loading: false });
    }
  },

  updatePref: async (userId, key, value) => {
    const prev = get().settings;
    set((s) => ({ settings: s.settings ? { ...s.settings, [key]: value } : s.settings }));
    try {
      await settingsApi.updateSettings(userId, { [key]: value });
    } catch (err) {
      captureException(err);
      set({ settings: prev });
    }
  },

  fetchBlocked: async (userId) => {
    try {
      const blocked = await settingsApi.listBlockedUsers(userId);
      set({ blocked });
    } catch (err) {
      captureException(err);
    }
  },

  blockUser: async (userId, targetId, displayName) => {
    const prev = get().blocked;
    set((s) => ({ blocked: [...s.blocked, { id: targetId, displayName }] }));
    try {
      await settingsApi.blockUser(userId, targetId);
    } catch (err) {
      set({ blocked: prev });
      captureException(err);
    }
  },

  unblockUser: async (userId, targetId) => {
    const prev = get().blocked;
    set((s) => ({ blocked: s.blocked.filter((b) => b.id !== targetId) }));
    try {
      await settingsApi.unblockUser(userId, targetId);
    } catch (err) {
      set({ blocked: prev });
      captureException(err);
    }
  },
}));
