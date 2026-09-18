import { create } from 'zustand';
import * as supportApi from '../services/supabase/support';
import { captureException } from '../services/analytics/analytics';
import type { SupportTicketMessageRow, SupportTicketRow } from '../services/supabase/types';

type SupportState = {
  tickets: SupportTicketRow[];
  messagesByTicket: Record<string, SupportTicketMessageRow[]>;
  loading: boolean;
  fetchMyTickets: (userId: string) => Promise<void>;
  createTicket: (userId: string, subject: string, firstMessage: string) => Promise<SupportTicketRow>;
  fetchTicket: (id: string) => Promise<void>;
  fetchMessages: (ticketId: string) => Promise<void>;
  sendMessage: (ticketId: string, senderId: string, message: string) => Promise<void>;
};

export const useSupportStore = create<SupportState>((set) => ({
  tickets: [],
  messagesByTicket: {},
  loading: false,

  fetchMyTickets: async (userId) => {
    set({ loading: true });
    try {
      const tickets = await supportApi.listMyTickets(userId);
      set({ tickets, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTicket: async (userId, subject, firstMessage) => {
    try {
      const ticket = await supportApi.createTicket(userId, subject, firstMessage);
      set((s) => ({ tickets: [ticket, ...s.tickets] }));
      return ticket;
    } catch (err) {
      captureException(err);
      throw err; // SupportScreen's own try/catch shows the specific error inline
    }
  },

  fetchTicket: async (id) => {
    try {
      const ticket = await supportApi.getTicket(id);
      if (!ticket) return;
      set((s) => {
        const idx = s.tickets.findIndex((t) => t.id === id);
        if (idx === -1) return { tickets: [ticket, ...s.tickets] };
        const next = [...s.tickets];
        next[idx] = ticket;
        return { tickets: next };
      });
    } catch (err) {
      captureException(err);
    }
  },

  fetchMessages: async (ticketId) => {
    try {
      const messages = await supportApi.listMessages(ticketId);
      set((s) => ({ messagesByTicket: { ...s.messagesByTicket, [ticketId]: messages } }));
    } catch (err) {
      captureException(err);
    }
  },

  sendMessage: async (ticketId, senderId, message) => {
    try {
      const row = await supportApi.addMessage(ticketId, senderId, message);
      set((s) => ({ messagesByTicket: { ...s.messagesByTicket, [ticketId]: [...(s.messagesByTicket[ticketId] ?? []), row] } }));
    } catch (err) {
      captureException(err);
      throw err; // SupportTicketDetailScreen's try/finally resets its "sending" state either way
    }
  },
}));
