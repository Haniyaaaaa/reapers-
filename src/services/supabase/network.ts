import { supabase } from './client';
import type { ConnectionRow, TeamCompensation, TeamRequestRow, TeamStage, TeamWorkMode } from './types';
import type { PersonCard, TeamApplicant, TeamRequest } from '../../types/extra';
import { PAGE_SIZE, toPage, type Page } from './pagination';
import { caseVariants, likePattern } from './searchText';

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

type PersonProfile = { id: string; display_name: string; avatar_uri: string | null; avatar_id: string | null; roles: PersonCard['roles']; skills: string[] };

async function connectionsByOther(myUserId: string) {
  const { data: connections } = await supabase.from('connections').select('*').or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`);
  return new Map((connections ?? []).map((c) => [c.requester_id === myUserId ? c.addressee_id : c.requester_id, c]));
}

/** Server-side people search over name, username and bio — same privacy rules as listPeople
 * (the RPC already drops non-discoverable and blocked profiles), but not capped to the first 100. */
export async function searchPeople(myUserId: string, query: string, limit = 40): Promise<PersonCard[]> {
  const p = likePattern(query);
  if (!p) return [];
  const [{ data: profiles, error }, byOther] = await Promise.all([
    supabase
      .rpc('list_network_people', { viewer_id: myUserId })
      .or(`display_name.ilike.${p},username.ilike.${p},bio.ilike.${p}`)
      .limit(limit),
    connectionsByOther(myUserId),
  ]);
  if (error) throw error;
  return ((profiles ?? []) as unknown as PersonProfile[]).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    avatarUri: row.avatar_uri ?? undefined,
    avatarId: row.avatar_id ?? undefined,
    roles: row.roles,
    skills: row.skills,
    connect: deriveConnectState(myUserId, byOther.get(row.id)),
  }));
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
    avatarUri: p.avatar_uri ?? undefined,
    avatarId: p.avatar_id ?? undefined,
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
    rows: page.rows.map((p) => ({ id: p.id, displayName: p.display_name, avatarUri: p.avatar_uri ?? undefined, avatarId: p.avatar_id ?? undefined, roles: p.roles, skills: p.skills, connect: 'connected' as const })),
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

type TeamRequestRowWithPoster = TeamRequestRow & { profiles?: { display_name?: string | null; avatar_uri: string | null; avatar_id: string | null } | null };

function teamRequestRowToTeamRequest(row: TeamRequestRowWithPoster): TeamRequest {
  return {
    id: row.id,
    posterId: row.poster_id,
    posterAvatarUri: row.profiles?.avatar_uri ?? undefined,
    posterAvatarId: row.profiles?.avatar_id ?? undefined,
    posterName: row.profiles?.display_name ?? undefined,
    createdAt: row.created_at,
    project: row.project,
    roles: row.roles,
    excerpt: row.excerpt,
    studio: row.studio ?? undefined,
    teamSize: row.team_size ?? undefined,
    stage: row.stage ?? undefined,
    engine: row.engine ?? undefined,
    location: row.location ?? undefined,
    hoursPerWeek: row.hours_per_week ?? undefined,
    compensation: row.compensation ?? undefined,
    neededBy: row.needed_by ?? undefined,
    workMode: row.work_mode ?? undefined,
  };
}

const TEAM_SELECT = '*, profiles!team_requests_poster_id_fkey(display_name, avatar_uri, avatar_id)';

export async function getTeamRequest(id: string): Promise<TeamRequest | null> {
  const { data, error } = await supabase.from('team_requests').select(TEAM_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? teamRequestRowToTeamRequest(data as unknown as TeamRequestRowWithPoster) : null;
}

/** The poster's own requests, each with how many people have applied so far. */
export async function listMyTeamRequests(userId: string): Promise<TeamRequest[]> {
  const { data, error } = await supabase
    .from('team_requests')
    .select(`${TEAM_SELECT}, team_request_applications(count)`)
    .eq('poster_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as (TeamRequestRowWithPoster & { team_request_applications: { count: number }[] })[]).map((row) => ({
    ...teamRequestRowToTeamRequest(row),
    applicantCount: row.team_request_applications?.[0]?.count ?? 0,
  }));
}

/** RLS (team_requests_delete_own) limits this to the poster (or an admin); applications cascade. */
export async function deleteTeamRequest(id: string): Promise<void> {
  const { error } = await supabase.from('team_requests').delete().eq('id', id);
  if (error) throw error;
}

export type TeamRequestFilters = {
  /** Inclusive YYYY-MM-DD window the role must be needed within. */
  neededFrom?: string;
  neededTo?: string;
  workModes?: TeamWorkMode[];
  /** Free-text city — matched anywhere in the request's location. */
  city?: string;
  roles?: string[];
  engines?: string[];
};

export async function listTeamRequests(offset = 0, limit = PAGE_SIZE, filters: TeamRequestFilters = {}): Promise<Page<TeamRequest>> {
  let query = supabase.from('team_requests').select(TEAM_SELECT);
  if (filters.neededFrom) query = query.gte('needed_by', filters.neededFrom);
  if (filters.neededTo) query = query.lte('needed_by', filters.neededTo);
  if (filters.workModes?.length) query = query.in('work_mode', filters.workModes);
  const city = (filters.city ?? '').replace(/[%_,()\\]/g, ' ').trim();
  if (city) query = query.ilike('location', `%${city}%`);
  if (filters.roles?.length) query = query.overlaps('roles', filters.roles);
  if (filters.engines?.length) query = query.in('engine', filters.engines);
  const { data, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data as unknown as TeamRequestRowWithPoster[], limit);
  return { rows: page.rows.map(teamRequestRowToTeamRequest), hasMore: page.hasMore };
}

/** Server-side team-request search over project, pitch, studio, engine and location, plus an exact
 * (case-insensitive by variant) match on the needed roles. Honours the active team filters. */
export async function searchTeamRequests(query: string, filters: TeamRequestFilters = {}, limit = 40): Promise<TeamRequest[]> {
  const p = likePattern(query);
  if (!p) return [];
  const clauses = [`project.ilike.${p}`, `excerpt.ilike.${p}`, `studio.ilike.${p}`, `engine.ilike.${p}`, `location.ilike.${p}`];
  for (const v of caseVariants(query)) clauses.push(`roles.cs.{"${v}"}`);
  let q = supabase.from('team_requests').select(TEAM_SELECT).or(clauses.join(','));
  if (filters.neededFrom) q = q.gte('needed_by', filters.neededFrom);
  if (filters.neededTo) q = q.lte('needed_by', filters.neededTo);
  if (filters.workModes?.length) q = q.in('work_mode', filters.workModes);
  const city = (filters.city ?? '').replace(/[%_,()\\]/g, ' ').trim();
  if (city) q = q.ilike('location', `%${city}%`);
  if (filters.roles?.length) q = q.overlaps('roles', filters.roles);
  if (filters.engines?.length) q = q.in('engine', filters.engines);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data as unknown as TeamRequestRowWithPoster[]).map(teamRequestRowToTeamRequest);
}

export type TeamRequestInput = {
  project: string;
  excerpt: string;
  roles: string[];
  studio?: string;
  teamSize?: number;
  stage?: TeamStage;
  engine?: string;
  location?: string;
  hoursPerWeek?: number;
  compensation?: TeamCompensation;
  neededBy?: string;
  workMode?: TeamWorkMode;
};

export async function postTeamRequest(posterId: string, input: TeamRequestInput): Promise<TeamRequest> {
  const { data, error } = await supabase
    .from('team_requests')
    .insert({
      poster_id: posterId,
      project: input.project,
      excerpt: input.excerpt,
      roles: input.roles,
      // Optional detail columns are only sent when filled in, so a plain request still posts
      // even before migration 0069 (which adds them) has reached the database.
      ...(input.studio !== undefined && { studio: input.studio }),
      ...(input.teamSize !== undefined && { team_size: input.teamSize }),
      ...(input.stage !== undefined && { stage: input.stage }),
      ...(input.engine !== undefined && { engine: input.engine }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.hoursPerWeek !== undefined && { hours_per_week: input.hoursPerWeek }),
      ...(input.compensation !== undefined && { compensation: input.compensation }),
      ...(input.neededBy !== undefined && { needed_by: input.neededBy }),
      ...(input.workMode !== undefined && { work_mode: input.workMode }),
    })
    .select()
    .single();
  if (error) throw error;
  return teamRequestRowToTeamRequest(data);
}

/** Full edit of the poster's own request. Unlike posting, a field left blank is sent as null so
 * clearing it in the form actually clears it. RLS (team_requests_update_own) scopes this to the
 * poster (or an admin). */
export async function updateTeamRequest(id: string, input: TeamRequestInput): Promise<TeamRequest> {
  const { data, error } = await supabase
    .from('team_requests')
    .update({
      project: input.project,
      excerpt: input.excerpt,
      roles: input.roles,
      studio: input.studio ?? null,
      team_size: input.teamSize ?? null,
      stage: input.stage ?? null,
      engine: input.engine ?? null,
      location: input.location ?? null,
      hours_per_week: input.hoursPerWeek ?? null,
      compensation: input.compensation ?? null,
      needed_by: input.neededBy ?? null,
      work_mode: input.workMode ?? null,
    })
    .eq('id', id)
    .select(TEAM_SELECT)
    .single();
  if (error) throw error;
  return teamRequestRowToTeamRequest(data as unknown as TeamRequestRowWithPoster);
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
    .select('created_at, profiles!team_request_applications_applicant_id_fkey(id, display_name, avatar_uri, avatar_id, roles, skills)')
    .eq('team_request_id', teamRequestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (
    data as unknown as {
      created_at: string;
      profiles: { id: string; display_name: string; avatar_uri: string | null; avatar_id: string | null; roles: string[]; skills: string[] } | null;
    }[]
  ).flatMap((r) =>
    r.profiles
      ? [{ id: r.profiles.id, displayName: r.profiles.display_name, avatarUri: r.profiles.avatar_uri ?? undefined, avatarId: r.profiles.avatar_id ?? undefined, roles: r.profiles.roles, skills: r.profiles.skills, appliedAt: r.created_at }]
      : [],
  );
}
