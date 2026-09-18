import { supabase } from './client';
import type { ConnectionRow, TeamRequestRow } from './types';
import type { PersonCard, TeamApplicant, TeamRequest } from '../../types/extra';
import { PAGE_SIZE, toPage, type Page } from './pagination';

/** Pushes a live callback whenever a `connections` row touching this user changes (someone
 * sends/accepts/declines a request) — without this, the Connect button / ProfileScreen only
 * ever caught up on the next manual refetch (screen focus), which reads as "I have to refresh
 * to see it" even though the data was already correct in the database. Two `postgres_changes`
 * filters are needed (not one `or(...)`) because Realtime's filter syntax doesn't support OR
 * across columns, only per-column equality. A unique channel name per call avoids the
 * "cannot add postgres_changes callbacks after subscribe()" collision documented on the posts
 * feed's equivalent subscription. */
export function subscribeToConnectionChanges(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`connections:${userId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `requester_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `addressee_id=eq.${userId}` }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function deriveConnectState(myUserId: string, conn: ConnectionRow | undefined): PersonCard['connect'] {
  if (!conn) return 'connect';
  if (conn.status === 'accepted') return 'connected';
  // A pending row is only actionable (shown as 'pending') from the sender's side; from the
  // recipient's side it's surfaced as 'connect' still, since tapping it is what accepts.
  return conn.requester_id === myUserId ? 'pending' : 'connect';
}

export async function listPeople(myUserId: string): Promise<PersonCard[]> {
  // Uses the list_network_people() RPC (not a plain `profiles` select) so non-discoverable
  // profiles and blocked-either-way pairs are excluded server-side — see Phase 7's
  // migration for why this can't be done with a client-side filter alone.
  const [{ data: profiles, error }, { data: connections }] = await Promise.all([
    supabase.rpc('list_network_people', { viewer_id: myUserId }).limit(100),
    supabase.from('connections').select('*').or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`),
  ]);
  if (error) throw error;
  const connByOther = new Map((connections ?? []).map((c) => [c.requester_id === myUserId ? c.addressee_id : c.requester_id, c]));
  return (profiles ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    roles: p.roles,
    skills: p.skills,
    connect: deriveConnectState(myUserId, connByOther.get(p.id)),
  }));
}

/** Paginated + searchable list of people the viewer is actually connected to — used by
 * "New Message" (ChatDirectoryScreen). Deliberately NOT sourced from listPeople() above:
 * that RPC caps at 100 *discoverable* profiles total, so a real connection outside that
 * window would silently never show up here. This queries the connections table directly via
 * a dedicated RPC (list_connected_people, 0053 migration), so it scales to however many
 * connections someone actually has instead of being capped by an unrelated directory limit. */
export async function listConnectedPeople(
  myUserId: string,
  opts: { search?: string; offset?: number; limit?: number; excludeIds?: string[] } = {},
): Promise<Page<PersonCard>> {
  const { search, offset = 0, limit = PAGE_SIZE, excludeIds } = opts;
  const { data, error } = await supabase.rpc('list_connected_people', {
    viewer_id: myUserId,
    search: search?.trim() || null,
    limit_count: limit,
    offset_count: offset,
    exclude_ids: excludeIds ?? [],
  });
  if (error) throw error;
  const page = toPage(data, limit);
  return {
    rows: page.rows.map((p) => ({ id: p.id, displayName: p.display_name, roles: p.roles, skills: p.skills, connect: 'connected' as const })),
    hasMore: page.hasMore,
  };
}

/** Mirrors the single generic Connect button's tap semantics: no existing relationship ->
 * send a request; an incoming pending request from the other side -> accept it; anything
 * else (my own outgoing pending request, or already connected) is a no-op. */
export async function connectPerson(myUserId: string, otherUserId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('connections')
    .select('*')
    .or(`and(requester_id.eq.${myUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${myUserId})`)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('connections').insert({ requester_id: myUserId, addressee_id: otherUserId });
    if (error) throw error;
    return;
  }
  if (existing.status === 'pending' && existing.requester_id === otherUserId) {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('requester_id', existing.requester_id)
      .eq('addressee_id', existing.addressee_id);
    if (error) throw error;
  }
}

export type ConnectionSummary = {
  otherId: string;
  otherName: string;
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
};

export async function listConnections(myUserId: string): Promise<ConnectionSummary[]> {
  const { data, error } = await supabase
    .from('connections')
    .select('requester_id, addressee_id, status, requester:profiles!connections_requester_id_fkey(display_name), addressee:profiles!connections_addressee_id_fkey(display_name)')
    .or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`);
  if (error) throw error;
  return (
    data as unknown as {
      requester_id: string;
      addressee_id: string;
      status: 'pending' | 'accepted' | 'declined';
      requester: { display_name: string } | null;
      addressee: { display_name: string } | null;
    }[]
  )
    .filter((row) => row.status !== 'declined')
    .map((row) => {
      const outgoing = row.requester_id === myUserId;
      return {
        otherId: outgoing ? row.addressee_id : row.requester_id,
        otherName: (outgoing ? row.addressee?.display_name : row.requester?.display_name) ?? 'Someone',
        status: row.status as 'pending' | 'accepted',
        direction: outgoing ? 'outgoing' : 'incoming',
      };
    });
}

export async function respondConnection(myUserId: string, otherUserId: string, accept: boolean): Promise<void> {
  if (accept) {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('requester_id', otherUserId)
      .eq('addressee_id', myUserId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('connections').delete().eq('requester_id', otherUserId).eq('addressee_id', myUserId);
    if (error) throw error;
  }
}

function teamRequestRowToTeamRequest(row: TeamRequestRow): TeamRequest {
  return { id: row.id, posterId: row.poster_id, project: row.project, roles: row.roles, excerpt: row.excerpt };
}

export async function listTeamRequests(offset = 0, limit = PAGE_SIZE): Promise<Page<TeamRequest>> {
  const { data, error } = await supabase
    .from('team_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data, limit);
  return { rows: page.rows.map(teamRequestRowToTeamRequest), hasMore: page.hasMore };
}

export async function postTeamRequest(posterId: string, input: { project: string; excerpt: string; roles: string[] }): Promise<TeamRequest> {
  const { data, error } = await supabase
    .from('team_requests')
    .insert({ poster_id: posterId, project: input.project, excerpt: input.excerpt, roles: input.roles })
    .select()
    .single();
  if (error) throw error;
  return teamRequestRowToTeamRequest(data);
}

export async function listMyTeamApplications(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('team_request_applications').select('team_request_id').eq('applicant_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.team_request_id));
}

export async function applyToTeamRequest(teamRequestId: string, applicantId: string): Promise<void> {
  const { error } = await supabase.from('team_request_applications').insert({ team_request_id: teamRequestId, applicant_id: applicantId });
  if (error) throw error;
}

/** RLS (team_request_applications_select) only returns rows here when the caller is the
 * request's poster (or the applicant themselves, or an admin) — no client-side ownership
 * check needed before calling this. */
export async function listTeamRequestApplicants(teamRequestId: string): Promise<TeamApplicant[]> {
  const { data, error } = await supabase
    .from('team_request_applications')
    .select('created_at, profiles!team_request_applications_applicant_id_fkey(id, display_name, roles, skills)')
    .eq('team_request_id', teamRequestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (
    data as unknown as {
      created_at: string;
      profiles: { id: string; display_name: string; roles: string[]; skills: string[] } | null;
    }[]
  ).flatMap((r) =>
    r.profiles
      ? [{ id: r.profiles.id, displayName: r.profiles.display_name, roles: r.profiles.roles, skills: r.profiles.skills, appliedAt: r.created_at }]
      : [],
  );
}
