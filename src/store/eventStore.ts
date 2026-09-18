import { create } from 'zustand';
import * as eventsApi from '../services/supabase/events';
import { captureException } from '../services/analytics/analytics';
import { playSound } from '../services/sound';
import type { EventPaymentApplication, GameEvent, PayoutAccount, RsvpStatus } from '../types/event';
import type { EventAttendee } from '../services/supabase/events';

type EventState = {
  events: GameEvent[];
  myEvents: GameEvent[];
  myEventsLoading: boolean;
  fetchMyEvents: (userId: string) => Promise<void>;
  eventsHasMore: boolean;
  loading: boolean;
  error: string | null;
  attendees: Record<string, EventAttendee[]>;
  fetchEvents: (userId: string) => Promise<void>;
  loadMoreEvents: (userId: string) => Promise<void>;
  createEvent: (input: {
    hostId: string;
    title: string;
    description: string;
    type: GameEvent['type'];
    category?: GameEvent['category'];
    startsAt: string;
    location: string;
    lat?: number;
    lng?: number;
    coverUrl?: string;
    maxAttendees?: number;
    paid: boolean;
    price?: number;
    currency?: string;
    payoutContactNote?: string;
    payoutAccounts?: { bankName: string; accountTitle: string; accountNumber: string; iban?: string }[];
  }) => Promise<GameEvent>;
  setRsvp: (eventId: string, userId: string, status: RsvpStatus, paidByUser?: boolean) => Promise<void>;
  updateEvent: (
    id: string,
    patch: { title?: string; description?: string; location?: string; startsAt?: string; coverUrl?: string; maxAttendees?: number | null },
  ) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  fetchAttendees: (eventId: string) => Promise<void>;

  // Paid events: host-published bank accounts + attendee proof-of-payment applications.
  payoutAccounts: Record<string, PayoutAccount[]>;
  fetchPayoutAccounts: (eventId: string) => Promise<void>;
  addPayoutAccount: (eventId: string, account: { bankName: string; accountTitle: string; accountNumber: string; iban?: string }) => Promise<void>;
  removePayoutAccount: (eventId: string, id: string) => Promise<void>;

  myApplication: Record<string, EventPaymentApplication | null>;
  fetchMyApplication: (eventId: string, userId: string) => Promise<void>;
  submitApplication: (input: { eventId: string; applicantId: string; payoutAccountId?: string; proofScreenshotPath: string }) => Promise<void>;
  resubmitApplication: (eventId: string, id: string, patch: { payoutAccountId?: string; proofScreenshotPath: string }) => Promise<void>;

  applications: Record<string, EventPaymentApplication[]>;
  applicationsHasMore: Record<string, boolean>;
  fetchApplications: (eventId: string) => Promise<void>;
  loadMoreApplications: (eventId: string) => Promise<void>;
  respondApplication: (eventId: string, id: string, approve: boolean, rejectionReason?: string) => Promise<void>;

  // Aggregated across every event this user hosts — the "Payment applications" entry point
  // on the profile screen, as opposed to `applications` above (scoped to one event).
  myHostApplications: EventPaymentApplication[];
  myHostApplicationsHasMore: boolean;
  fetchMyHostApplications: (hostId: string) => Promise<void>;
  loadMoreMyHostApplications: (hostId: string) => Promise<void>;
};

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  myEvents: [],
  myEventsLoading: false,

  fetchMyEvents: async (userId) => {
    set({ myEventsLoading: true });
    try {
      const rows = await eventsApi.listMyEvents(userId);
      set({ myEvents: rows, myEventsLoading: false });
    } catch (err) {
      captureException(err);
      set({ myEventsLoading: false });
    }
  },
  eventsHasMore: false,
  loading: false,
  error: null,
  attendees: {},
  payoutAccounts: {},
  myApplication: {},
  applications: {},
  myHostApplications: [],
  myHostApplicationsHasMore: false,
  applicationsHasMore: {},

  fetchEvents: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { rows, hasMore } = await eventsApi.listEvents(userId, 0);
      set({ events: rows, eventsHasMore: hasMore, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Could not load events' });
    }
  },

  loadMoreEvents: async (userId) => {
    try {
      const { rows, hasMore } = await eventsApi.listEvents(userId, get().events.length);
      set((s) => ({ events: [...s.events, ...rows], eventsHasMore: hasMore }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load more events' });
    }
  },

  createEvent: async (input) => {
    try {
      const event = await eventsApi.createEvent({
        host_id: input.hostId,
        title: input.title,
        description: input.description,
        type: input.type,
        category: input.category,
        starts_at: input.startsAt,
        location: input.location,
        lat: input.lat,
        lng: input.lng,
        cover_url: input.coverUrl,
        max_attendees: input.maxAttendees,
        paid: input.paid,
        price: input.price,
        currency: input.currency,
        payout_contact_note: input.payoutContactNote,
      });
      if (input.payoutAccounts?.length) {
        await eventsApi.createPayoutAccounts(event.id, input.payoutAccounts);
      }
      // The creator implicitly attends their own event (host is exempted from the paid-event
      // proof-of-payment gate — see 0025_event_rsvp_host_exempt.sql).
      await eventsApi.setRsvp(event.id, input.hostId, 'going');
      const withRsvp = { ...event, rsvp: 'going' as RsvpStatus, attendeeCount: 1 };
      set((s) => ({ events: [withRsvp, ...s.events] }));
      return withRsvp;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not create event' });
      captureException(err);
      throw err;
    }
  },

  setRsvp: async (eventId, userId, status, paidByUser = false) => {
    const prev = get().events.find((e) => e.id === eventId);
    const prevGoing = prev?.rsvp === 'going';
    const nowGoing = status === 'going';
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId
          ? { ...e, rsvp: status, paidByUser, attendeeCount: e.attendeeCount + (nowGoing && !prevGoing ? 1 : !nowGoing && prevGoing ? -1 : 0) }
          : e,
      ),
    }));
    try {
      await eventsApi.setRsvp(eventId, userId, status, paidByUser);
    } catch (err) {
      // Roll back the optimistic update — without this, a failed RSVP left the UI showing
      // a state the server never actually recorded.
      if (prev) set((s) => ({ events: s.events.map((e) => (e.id === eventId ? prev : e)) }));
      set({ error: err instanceof Error ? err.message : 'Could not update RSVP' });
      captureException(err);
      throw err;
    }
  },

  updateEvent: async (id, patch) => {
    try {
      const row = await eventsApi.updateEvent(id, {
        title: patch.title,
        description: patch.description,
        location: patch.location,
        starts_at: patch.startsAt,
        cover_url: patch.coverUrl,
        max_attendees: patch.maxAttendees,
      });
      set((s) => ({
        events: s.events.map((e) =>
          e.id === id
            ? {
                ...e,
                title: row.title,
                description: row.description,
                location: row.location,
                startsAt: row.starts_at,
                cover: row.cover_url ?? e.cover,
                maxAttendees: row.max_attendees ?? undefined,
              }
            : e,
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not update event' });
      captureException(err);
      throw err;
    }
  },

  deleteEvent: async (id) => {
    try {
      await eventsApi.deleteEvent(id);
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not delete event' });
      captureException(err);
      throw err;
    }
  },

  fetchAttendees: async (eventId) => {
    try {
      const rows = await eventsApi.listEventAttendees(eventId);
      set((s) => ({ attendees: { ...s.attendees, [eventId]: rows } }));
    } catch (err) {
      captureException(err);
    }
  },

  fetchPayoutAccounts: async (eventId) => {
    try {
      const rows = await eventsApi.listPayoutAccounts(eventId);
      set((s) => ({ payoutAccounts: { ...s.payoutAccounts, [eventId]: rows } }));
    } catch (err) {
      captureException(err);
    }
  },

  addPayoutAccount: async (eventId, account) => {
    try {
      const row = await eventsApi.addPayoutAccount(eventId, account);
      set((s) => ({ payoutAccounts: { ...s.payoutAccounts, [eventId]: [...(s.payoutAccounts[eventId] ?? []), row] } }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  removePayoutAccount: async (eventId, id) => {
    const prev = get().payoutAccounts[eventId];
    set((s) => ({ payoutAccounts: { ...s.payoutAccounts, [eventId]: (s.payoutAccounts[eventId] ?? []).filter((a) => a.id !== id) } }));
    try {
      await eventsApi.deletePayoutAccount(id);
    } catch (err) {
      if (prev) set((s) => ({ payoutAccounts: { ...s.payoutAccounts, [eventId]: prev } }));
      captureException(err);
    }
  },

  fetchMyApplication: async (eventId, userId) => {
    try {
      const application = await eventsApi.getMyApplication(eventId, userId);
      set((s) => ({ myApplication: { ...s.myApplication, [eventId]: application } }));
    } catch (err) {
      captureException(err);
    }
  },

  submitApplication: async (input) => {
    try {
      const application = await eventsApi.submitPaymentApplication(input);
      set((s) => ({ myApplication: { ...s.myApplication, [input.eventId]: application } }));
    } catch (err) {
      captureException(err);
      throw err; // caller shows the specific error and can clean up the just-uploaded screenshot
    }
  },

  resubmitApplication: async (eventId, id, patch) => {
    try {
      const application = await eventsApi.resubmitPaymentApplication(id, patch);
      set((s) => ({ myApplication: { ...s.myApplication, [eventId]: application } }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  fetchApplications: async (eventId) => {
    try {
      const { rows, hasMore } = await eventsApi.listApplicationsForEvent(eventId, 0);
      set((s) => ({ applications: { ...s.applications, [eventId]: rows }, applicationsHasMore: { ...s.applicationsHasMore, [eventId]: hasMore } }));
    } catch (err) {
      captureException(err);
    }
  },

  loadMoreApplications: async (eventId) => {
    try {
      const offset = get().applications[eventId]?.length ?? 0;
      const { rows, hasMore } = await eventsApi.listApplicationsForEvent(eventId, offset);
      set((s) => ({
        applications: { ...s.applications, [eventId]: [...(s.applications[eventId] ?? []), ...rows] },
        applicationsHasMore: { ...s.applicationsHasMore, [eventId]: hasMore },
      }));
    } catch (err) {
      captureException(err);
    }
  },

  respondApplication: async (eventId, id, approve, rejectionReason) => {
    const prevScoped = get().applications[eventId];
    const prevAggregate = get().myHostApplications;
    set((s) => ({
      applications: { ...s.applications, [eventId]: (s.applications[eventId] ?? []).filter((a) => a.id !== id) },
      myHostApplications: s.myHostApplications.filter((a) => a.id !== id),
    }));
    try {
      await eventsApi.respondApplication(id, approve, rejectionReason);
      if (approve) playSound('approve');
    } catch (err) {
      if (prevScoped) set((s) => ({ applications: { ...s.applications, [eventId]: prevScoped } }));
      set({ myHostApplications: prevAggregate });
      captureException(err);
      throw err;
    }
  },

  fetchMyHostApplications: async (hostId) => {
    try {
      const { rows, hasMore } = await eventsApi.listMyHostApplications(hostId, 0);
      set({ myHostApplications: rows, myHostApplicationsHasMore: hasMore });
    } catch (err) {
      captureException(err);
    }
  },

  loadMoreMyHostApplications: async (hostId) => {
    try {
      const { rows, hasMore } = await eventsApi.listMyHostApplications(hostId, get().myHostApplications.length);
      set((s) => ({ myHostApplications: [...s.myHostApplications, ...rows], myHostApplicationsHasMore: hasMore }));
    } catch (err) {
      captureException(err);
    }
  },
}));
