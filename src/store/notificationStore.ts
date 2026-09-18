import { create } from 'zustand';
import * as notificationsApi from '../services/supabase/notifications';
import { captureException } from '../services/analytics/analytics';
import type { NotificationItem } from '../types/extra';

type NotificationState = {
  notes: NotificationItem[];
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markNoteRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  handleRealtimeInsert: (note: NotificationItem) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotifications: async (userId) => {
    set({ loading: true });
    try {
      const notes = await notificationsApi.listNotifications(userId);
      set({ notes, loading: false });
    } catch (err) {
      captureException(err);
      set({ loading: false });
    }
  },

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
