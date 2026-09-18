import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  seenGuidelines: Record<string, true>;
  markGuidelinesSeen: (id: string) => void;
};

function derive(connected: boolean, simulateOffline: boolean) {
  return simulateOffline || !connected;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
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
      seenGuidelines: {},
      markGuidelinesSeen: (id) => set((s) => ({ seenGuidelines: { ...s.seenGuidelines, [id]: true } })),
    }),
    {
      name: 'reaper-ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        streakEmoji: state.streakEmoji,
        seenGuidelines: state.seenGuidelines,
      }),
    }
  )
);

