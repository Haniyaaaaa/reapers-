import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { currentUser as seedUser } from '../data/mock';
import type { User } from '../types/user';

const KEY = 'reapers.session.v1';

type Persisted = {
  token: string;
  user: User;
  onboarded: boolean;
};

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: User | null;
  onboarded: boolean;
  hydrate: () => Promise<void>;
  login: (email: string) => Promise<void>;
  signup: (email: string) => Promise<void>;
  completeOnboarding: (partial: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
};

async function persist(data: Persisted | null) {
  if (!data) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

function withEmail(email: string): User {
  const name = email.split('@')[0] || 'player';
  return {
    ...seedUser,
    email,
    username: name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  token: null,
  user: null,
  onboarded: false,
  hydrate: async () => {
    const finish = async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const data = JSON.parse(raw) as Persisted;
          set({ token: data.token, user: data.user, onboarded: data.onboarded, hydrated: true });
          return;
        }
      } catch {
        // ignore corrupt session or storage errors
      }
      set({ hydrated: true });
    };
    await Promise.race([
      finish(),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!get().hydrated) set({ hydrated: true });
          resolve();
        }, 800);
      }),
    ]);
    if (!get().hydrated) set({ hydrated: true });
  },
  login: async (email) => {
    const user = withEmail(email);
    const token = 'mock-token';
    await persist({ token, user, onboarded: true });
    set({ token, user, onboarded: true });
  },
  signup: async (email) => {
    const user = withEmail(email);
    const token = 'mock-token';
    await persist({ token, user, onboarded: false });
    set({ token, user, onboarded: false });
  },
  completeOnboarding: async (partial) => {
    const user = { ...(get().user as User), ...partial };
    const token = get().token ?? 'mock-token';
    await persist({ token, user, onboarded: true });
    set({ user, onboarded: true, token });
  },
  logout: async () => {
    await persist(null);
    set({ token: null, user: null, onboarded: false });
  },
}));
