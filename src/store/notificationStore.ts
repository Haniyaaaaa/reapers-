import { create } from 'zustand';
import { reconcile, swr, type FetchOpts } from './swr';
import * as notificationsApi from '../services/supabase/notifications';
import { captureException } from '../services/analytics/analytics';
import type { NotificationItem } from '../types/extra';

type NotificationState = {
  notes: NotificationItem[];
  loading: boolean;
  fetchNotifications: (userId: string, opts?: FetchOpts) => Promise<void>;
  markNoteRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  handleRealtimeInsert: (note: NotificationItem) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotifications: (userId, opts) =>
    swr(
      `notifications:${userId}`,
      async () => {
        set((s) => ({ loading: s.notes.length === 0 }));
        try {
          const notes = await notificationsApi.listNotifications(userId);
          set((s) => ({ notes: reconcile(s.notes, notes), loading: false }));
          return true;
        } catch (err) {
          captureException(err);
          set({ loading: false });
          return false;
        }
      },
      opts,
    ),

  markNoteRead: async (id) => {
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    try {
      await notificationsApi.markNotificationRead(id);
    } catch (err) {
      captureException(err);
    }
  },

  markAllRead: async (userId) => {
    set((s) => ({ notes: s.notes.map((n) => ({ ...n, read: true })) }));
    try {
      await notificationsApi.markAllNotificationsRead(userId);
    } catch (err) {
      captureException(err);
    }
  },

  deleteNote: async (id) => {
    const prev = get().notes;
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    try {
      await notificationsApi.deleteNotification(id);
    } catch (err) {
      set({ notes: prev });
      captureException(err);
    }
  },

  handleRealtimeInsert: (note) => {
    set((s) => (s.notes.some((n) => n.id === note.id) ? s : { notes: [note, ...s.notes] }));
  },
}));
