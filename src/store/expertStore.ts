import { create } from 'zustand';
import * as expertsApi from '../services/supabase/experts';
import { captureException, track } from '../services/analytics/analytics';
import type { ExpertRow } from '../services/supabase/types';
import type { Expert } from '../types/expert';
import type { BookingSummary, ExpertSlot } from '../types/extra';
import { parseSlot, type WeeklyAvailability } from '../utils/expertSlots';

type ExpertState = {
  experts: Expert[];
  expertsHasMore: boolean;
  expertsTotalCount: number;
  loading: boolean;
  error: string | null;
  bookedSlots: Record<string, ExpertSlot[]>;
  myApplication: ExpertRow | null;
  myBookings: BookingSummary[];
  myBookingsLoading: boolean;
  myBookingsError: string | null;
  availability: Record<string, WeeklyAvailability>;
  sessionCounts: Record<string, number>;
  reviewedBookingIds: Set<string>;
  recommendedExperts: Expert[];
  recommendedHasMore: boolean;
  recommendedIsFallback: boolean;
  fetchAvailability: (expertId: string) => Promise<void>;
  updateAvailability: (expertId: string, pattern: WeeklyAvailability) => Promise<void>;
  fetchMyBookings: (userId: string) => Promise<void>;
  expertsSpecialty: string | undefined;
  expertsExcludeUserId: string | undefined;
  fetchExperts: (specialty?: string, excludeUserId?: string) => Promise<void>;
  loadMoreExperts: () => Promise<void>;
  fetchExpert: (id: string) => Promise<void>;
  fetchBookedSlots: (expertId: string) => Promise<void>;
  fetchMyApplication: (userId: string) => Promise<void>;
  applyAsExpert: (
    userId: string,
    input: { role: string; company: string; bio: string; specialties: string[]; portfolioUrl?: string; linkedinUrl?: string }
  ) => Promise<void>;
  bookSlot: (expertId: string, requesterId: string, day: string, time: string) => Promise<'ok' | 'conflict' | 'requires_pro'>;
  updateExpertProfile: (
    userId: string,
    patch: { role?: string; company?: string; bio?: string; specialties?: string[]; portfolioUrl?: string; linkedinUrl?: string }
  ) => Promise<void>;
  setMeetingLink: (bookingId: string, meetingLink: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;

  fetchRecommended: (viewerSkills: string[], excludeUserId?: string) => Promise<void>;
  loadMoreRecommended: (viewerSkills: string[], excludeUserId?: string) => Promise<void>;
  ensureReviewedBookingsLoaded: (userId: string) => Promise<void>;
  submitExpertReview: (bookingId: string, expertId: string, reviewerId: string, rating: number, comment: string) => Promise<void>;
};

function upsertExpert(experts: Expert[], expert: Expert): Expert[] {
  const idx = experts.findIndex((e) => e.id === expert.id);
  if (idx === -1) return [expert, ...experts];
  const next = [...experts];
  next[idx] = expert;
  return next;
}

export const useExpertStore = create<ExpertState>((set, get) => ({
  experts: [],
  expertsHasMore: false,
  expertsTotalCount: 0,
  loading: false,
  error: null,
  bookedSlots: {},
  myApplication: null,
  myBookings: [],
  myBookingsLoading: false,
  myBookingsError: null,
  availability: {},
  sessionCounts: {},
  reviewedBookingIds: new Set(),
  recommendedExperts: [],
  recommendedHasMore: false,
  recommendedIsFallback: false,
  expertsSpecialty: undefined,
  expertsExcludeUserId: undefined,

  fetchAvailability: async (expertId) => {
    try {
      const pattern = await expertsApi.getAvailability(expertId);
      set((s) => ({ availability: { ...s.availability, [expertId]: pattern } }));
    } catch (err) {
      // Non-fatal: ExpertProfileScreen/ExpertAvailabilityScreen degrade to "no availability
      // loaded yet" rather than crash a mount-time effect.
      captureException(err);
    }
  },

  updateAvailability: async (expertId, pattern) => {
    try {
      await expertsApi.setAvailability(expertId, pattern);
      set((s) => ({ availability: { ...s.availability, [expertId]: pattern } }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  fetchMyBookings: async (userId) => {
    set({ myBookingsLoading: true, myBookingsError: null });
    try {
      const myBookings = await expertsApi.listMyBookings(userId);
      set({ myBookings, myBookingsLoading: false });
    } catch (err) {
      captureException(err);
      set({ myBookingsLoading: false, myBookingsError: err instanceof Error ? err.message : 'Could not load bookings' });
    }
  },

  fetchExperts: async (specialty, excludeUserId) => {
    set({ loading: true, error: null, expertsSpecialty: specialty, expertsExcludeUserId: excludeUserId });
    try {
      const [{ rows, hasMore }, expertsTotalCount] = await Promise.all([
        expertsApi.listVerifiedExperts(0, undefined, specialty, excludeUserId),
        expertsApi.listExpertsCount(specialty, excludeUserId),
      ]);
      const sessionCounts = await expertsApi.listSessionCounts(rows.map((e) => e.id));
      set((s) => ({ experts: rows, expertsHasMore: hasMore, expertsTotalCount, loading: false, sessionCounts: { ...s.sessionCounts, ...Object.fromEntries(sessionCounts) } }));
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Could not load experts' });
    }
  },

  loadMoreExperts: async () => {
    try {
      const { rows, hasMore } = await expertsApi.listVerifiedExperts(get().experts.length, undefined, get().expertsSpecialty, get().expertsExcludeUserId);
      const sessionCounts = await expertsApi.listSessionCounts(rows.map((e) => e.id));
      set((s) => ({ experts: [...s.experts, ...rows], expertsHasMore: hasMore, sessionCounts: { ...s.sessionCounts, ...Object.fromEntries(sessionCounts) } }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load more experts' });
    }
  },

  fetchRecommended: async (viewerSkills, excludeUserId) => {
    try {
      const { rows, hasMore } = await expertsApi.listRecommendedExperts(viewerSkills, excludeUserId);
      if (rows.length === 0) {
        // No real match — fall back to the plain top-rated list, but flag it so the screen
        // relabels the section honestly instead of claiming a personalization that isn't real.
        const fallback = await expertsApi.listVerifiedExperts(0, undefined, undefined, excludeUserId);
        set({ recommendedExperts: fallback.rows, recommendedHasMore: fallback.hasMore, recommendedIsFallback: true });
        return;
      }
      const sessionCounts = await expertsApi.listSessionCounts(rows.map((e) => e.id));
      set((s) => ({ recommendedExperts: rows, recommendedHasMore: hasMore, recommendedIsFallback: false, sessionCounts: { ...s.sessionCounts, ...Object.fromEntries(sessionCounts) } }));
    } catch (err) {
      captureException(err);
    }
  },

  loadMoreRecommended: async (viewerSkills, excludeUserId) => {
    const { recommendedExperts, recommendedIsFallback } = get();
    try {
      const { rows, hasMore } = recommendedIsFallback
        ? await expertsApi.listVerifiedExperts(recommendedExperts.length, undefined, undefined, excludeUserId)
        : await expertsApi.listRecommendedExperts(viewerSkills, excludeUserId, recommendedExperts.length);
      const sessionCounts = await expertsApi.listSessionCounts(rows.map((e) => e.id));
      set((s) => ({ recommendedExperts: [...s.recommendedExperts, ...rows], recommendedHasMore: hasMore, sessionCounts: { ...s.sessionCounts, ...Object.fromEntries(sessionCounts) } }));
    } catch (err) {
      captureException(err);
    }
  },

  ensureReviewedBookingsLoaded: async (userId) => {
    try {
      const ids = await expertsApi.getMyReviewedBookingIds(userId);
      set({ reviewedBookingIds: ids });
    } catch (err) {
      captureException(err);
    }
  },

  submitExpertReview: async (bookingId, expertId, reviewerId, rating, comment) => {
    await expertsApi.submitExpertReview(bookingId, expertId, reviewerId, rating, comment);
    set((s) => ({ reviewedBookingIds: new Set(s.reviewedBookingIds).add(bookingId) }));
  },

  fetchExpert: async (id) => {
    try {
      const expert = await expertsApi.getExpert(id);
      if (expert) set((s) => ({ experts: upsertExpert(s.experts, expert) }));
    } catch (err) {
      captureException(err);
    }
  },

  fetchBookedSlots: async (expertId) => {
    try {
      const slots = await expertsApi.listBookedSlots(expertId);
      set((s) => ({ bookedSlots: { ...s.bookedSlots, [expertId]: slots } }));
    } catch (err) {
      captureException(err);
    }
  },

  fetchMyApplication: async (userId) => {
    try {
      const application = await expertsApi.getMyApplication(userId);
      set({ myApplication: application });
    } catch (err) {
      captureException(err);
    }
  },

  applyAsExpert: async (userId, input) => {
    try {
      const application = await expertsApi.applyAsExpert({
        id: userId,
        role: input.role,
        company: input.company,
        bio: input.bio,
        specialties: input.specialties,
        portfolio_url: input.portfolioUrl || null,
        linkedin_url: input.linkedinUrl || null,
      });
      set({ myApplication: application });
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  bookSlot: async (expertId, requesterId, day, time) => {
    const startsAt = parseSlot(day, time);
    if (!startsAt) return 'conflict';
    try {
      const result = await expertsApi.bookSlot(expertId, requesterId, startsAt);
      if (result === 'ok') {
        set((s) => ({
          bookedSlots: { ...s.bookedSlots, [expertId]: [...(s.bookedSlots[expertId] ?? []), { day, time, available: false }] },
        }));
        track('booking_confirmed', { expertId });
      }
      return result;
    } catch (err) {
      // expertsApi.bookSlot already distinguishes 'requires_pro' (errcode 55007) from a real
      // conflict (23505) by Postgres error code — anything else (network, RLS) still renders
      // as a conflict rather than hanging or rejecting uncaught.
      captureException(err);
      return 'conflict';
    }
  },

  updateExpertProfile: async (userId, patch) => {
    try {
      const { portfolioUrl, linkedinUrl, ...rest } = patch;
      const application = await expertsApi.updateExpertProfile(userId, {
        ...rest,
        ...(portfolioUrl !== undefined ? { portfolio_url: portfolioUrl || null } : {}),
        ...(linkedinUrl !== undefined ? { linkedin_url: linkedinUrl || null } : {}),
      });
      set((s) => ({
        myApplication: application,
        experts: s.experts.map((e) => (e.id === userId ? { ...e, ...rest, portfolioUrl, linkedinUrl } : e)),
      }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  cancelBooking: async (bookingId) => {
    try {
      await expertsApi.cancelBooking(bookingId);
      set((s) => ({ myBookings: s.myBookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)) }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },

  setMeetingLink: async (bookingId, meetingLink) => {
    try {
      await expertsApi.setBookingMeetingLink(bookingId, meetingLink);
      set((s) => ({ myBookings: s.myBookings.map((b) => (b.id === bookingId ? { ...b, expertMeetingLink: meetingLink } : b)) }));
    } catch (err) {
      captureException(err);
      throw err;
    }
  },
}));
