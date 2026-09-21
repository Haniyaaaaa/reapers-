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
  offline: boolean;
  setConnected: (connected: boolean) => void;
  seenGuidelines: Record<string, true>;
  markGuidelinesSeen: (id: string) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      streakEmoji: 'cyborg',
      setStreakEmoji: (streakEmoji) => set({ streakEmoji }),
      connected: true,
      offline: false,
      setConnected: (connected) => set({ connected, offline: !connected }),
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

