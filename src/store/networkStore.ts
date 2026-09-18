import { create } from 'zustand';
import * as networkApi from '../services/supabase/network';
import { captureException } from '../services/analytics/analytics';
import { playSound } from '../services/sound';
import type { ConnectionSummary } from '../services/supabase/network';
import type { PersonCard, TeamApplicant, TeamRequest } from '../types/extra';

type NetworkState = {
  people: PersonCard[];
  teams: TeamRequest[];
  teamsHasMore: boolean;
  appliedTeams: Set<string>;
  applicantsByTeam: Record<string, TeamApplicant[]>;
  applicantsLoading: Record<string, boolean>;
  connections: ConnectionSummary[];
  connectionsLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchPeople: (userId: string) => Promise<void>;
  fetchTeams: (userId: string) => Promise<void>;
  loadMoreTeams: () => Promise<void>;
  connectPerson: (myUserId: string, otherUserId: string) => Promise<void>;
  postTeam: (posterId: string, req: { project: string; excerpt: string; roles: string[] }) => Promise<void>;
  applyTeam: (userId: string, teamRequestId: string) => Promise<void>;
  fetchApplicants: (teamRequestId: string) => Promise<void>;
  fetchConnections: (userId: string) => Promise<void>;
  respondConnection: (myUserId: string, otherUserId: string, accept: boolean) => Promise<void>;
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
  people: [],
  teams: [],
  teamsHasMore: false,
  appliedTeams: new Set(),
  applicantsByTeam: {},
  applicantsLoading: {},
  connections: [],
  connectionsLoading: false,
  loading: false,
  error: null,

  fetchPeople: async (userId) => {
    set({ loading: true, error: null });
    try {
      const people = await networkApi.listPeople(userId);
      set({ people, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Could not load people' });
    }
  },

  fetchTeams: async (userId) => {
    try {
      const [{ rows, hasMore }, applied] = await Promise.all([networkApi.listTeamRequests(0), networkApi.listMyTeamApplications(userId)]);
      set({ teams: rows, teamsHasMore: hasMore, appliedTeams: applied });
    } catch (err) {
      captureException(err);
    }
  },

  loadMoreTeams: async () => {
    try {
      const { rows, hasMore } = await networkApi.listTeamRequests(get().teams.length);
      set((s) => ({ teams: [...s.teams, ...rows], teamsHasMore: hasMore }));
    } catch (err) {
      captureException(err);
    }
  },

  connectPerson: async (myUserId, otherUserId) => {
    const before = get().people.find((p) => p.id === otherUserId)?.connect;
    const optimistic = before === 'connect' ? 'pending' : before === 'pending' ? 'connected' : before;
    set((s) => ({ people: s.people.map((p) => (p.id === otherUserId ? { ...p, connect: optimistic ?? p.connect } : p)) }));
    try {
      await networkApi.connectPerson(myUserId, otherUserId);
      playSound('connect');
    } catch (err) {
      set((s) => ({ people: s.people.map((p) => (p.id === otherUserId ? { ...p, connect: before ?? p.connect } : p)) }));
      captureException(err);
    }
  },

  postTeam: async (posterId, req) => {
    try {
      const team = await networkApi.postTeamRequest(posterId, req);
      set((s) => ({ teams: [team, ...s.teams] }));
    } catch (err) {
      captureException(err);
      throw err; // PostTeamRequestScreen's own try/catch shows the error inline
    }
  },

  applyTeam: async (userId, teamRequestId) => {
    const team = get().teams.find((t) => t.id === teamRequestId);
    if (team && team.posterId === userId) return;
    set((s) => ({ appliedTeams: new Set(s.appliedTeams).add(teamRequestId) }));
    try {
      await networkApi.applyToTeamRequest(teamRequestId, userId);
    } catch (err) {
      set((s) => {
        const next = new Set(s.appliedTeams);
        next.delete(teamRequestId);
        return { appliedTeams: next };
      });
      captureException(err);
    }
  },

  fetchApplicants: async (teamRequestId) => {
    set((s) => ({ applicantsLoading: { ...s.applicantsLoading, [teamRequestId]: true } }));
    try {
      const applicants = await networkApi.listTeamRequestApplicants(teamRequestId);
      set((s) => ({
        applicantsByTeam: { ...s.applicantsByTeam, [teamRequestId]: applicants },
        applicantsLoading: { ...s.applicantsLoading, [teamRequestId]: false },
      }));
    } catch (err) {
      captureException(err);
      set((s) => ({ applicantsLoading: { ...s.applicantsLoading, [teamRequestId]: false } }));
    }
  },

  fetchConnections: async (userId) => {
    set({ connectionsLoading: true });
    try {
      const connections = await networkApi.listConnections(userId);
      set({ connections, connectionsLoading: false });
    } catch (err) {
      captureException(err);
      set({ connectionsLoading: false });
    }
  },

  respondConnection: async (myUserId, otherUserId, accept) => {
    const prev = get().connections;
    const prevPeople = get().people;
    set((s) => ({
      connections: accept
        ? s.connections.map((c) => (c.otherId === otherUserId ? { ...c, status: 'accepted' } : c))
        : s.connections.filter((c) => c.otherId !== otherUserId),
      // The `people` list (Network screen cards, ProfileScreen's Connect button) has its own
      // independent `connect` status snapshot from when it was fetched — without updating it
      // here too, accepting/declining here left it stuck showing stale "Pending" until the
      // next full fetchPeople().
      people: s.people.map((p) => (p.id === otherUserId ? { ...p, connect: accept ? 'connected' : 'connect' } : p)),
    }));
    try {
      await networkApi.respondConnection(myUserId, otherUserId, accept);
      if (accept) playSound('connect');
    } catch (err) {
      set({ connections: prev, people: prevPeople });
      captureException(err);
    }
  },
}));
