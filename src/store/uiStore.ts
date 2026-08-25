import { create } from 'zustand';
import type { ThemeMode } from '../theme/palettes';
import type { StreakOptionId } from '../data/streaks';

type UiState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  streakEmoji: StreakOptionId;
  setStreakEmoji: (id: StreakOptionId) => void;
  connected: boolean;
  simulateOffline: boolean;
  offline: boolean;
  setConnected: (connected: boolean) => void;
  setOffline: (offline: boolean) => void;
  blocked: string[];
  unblock: (id: string) => void;
  prefs: { chat: boolean; events: boolean; demos: boolean; bookings: boolean; discoverable: boolean };
  setPref: (key: keyof UiState['prefs'], value: boolean) => void;
};

function derive(connected: boolean, simulateOffline: boolean) {
  return simulateOffline || !connected;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  streakEmoji: 'cyborg',
  setStreakEmoji: (streakEmoji) => set({ streakEmoji }),
  connected: true,
  simulateOffline: false,
  offline: false,
  setConnected: (connected) =>
    set((s) => ({ connected, offline: derive(connected, s.simulateOffline) })),
  setOffline: (offline) =>
    set((s) => ({ simulateOffline: offline, offline: derive(s.connected, offline) })),
  blocked: ['spam_bot'],
  unblock: (id) => set((s) => ({ blocked: s.blocked.filter((b) => b !== id) })),
  prefs: { chat: true, events: true, demos: false, bookings: true, discoverable: true },
  setPref: (key, value) => set((s) => ({ prefs: { ...s.prefs, [key]: value } })),
}));
