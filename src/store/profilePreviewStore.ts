import { create } from 'zustand';

type ProfilePreviewState = {
  userId: string | null;
  open: (userId: string) => void;
  close: () => void;
};

export const useProfilePreviewStore = create<ProfilePreviewState>((set) => ({
  userId: null,
  open: (userId) => set({ userId }),
  close: () => set({ userId: null }),
}));
