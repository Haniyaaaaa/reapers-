import { supabase } from './client';
import type { CommunityRow } from './types';
import type { Community } from '../../types/community';
import { communityLogos } from '../../data/communityLogos';
import { brandLogo } from '../../data/brand';
import { PAGE_SIZE, toPage, type Page } from './pagination';

const LOCAL_LOGO_BY_SHORT_NAME: Record<string, (typeof communityLogos)[keyof typeof communityLogos]> = {
  cega: communityLogos.cega,
  pgda: communityLogos.pgda,
  igda: communityLogos.igda,
  pakgamedev: communityLogos.pakgamedev,
  pigd: communityLogos.pigd,
};

function resolveLogo(row: CommunityRow) {
  if (row.logo_url) return { uri: row.logo_url };
  return LOCAL_LOGO_BY_SHORT_NAME[row.short_name.toLowerCase().replace(/\s+/g, '')] ?? brandLogo;
}

function communityRowToCommunity(row: CommunityRow, joined: boolean): Community {
  return {
    id: row.id,
    createdBy: row.created_by,
    shortName: row.short_name,
    name: row.name,
    description: row.description,
    logo: resolveLogo(row),
    logoUrl: row.logo_url ?? undefined,
    memberCount: row.member_count,
    joined,
    location: row.location ?? undefined,
    tags: row.tags,
  };
}

/** Server-side search across name, short name, description and location, so it finds a community
 * wherever it sits — not just among the first page the list screen happens to have loaded.
 * Biggest communities first. Characters that would break PostgREST's `or()` syntax are stripped. */
export async function searchCommunities(userId: string, query: string, limit = 40): Promise<Community[]> {
  const needle = query.replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!needle) return [];
  const pattern = `%${needle}%`;
  const [{ data: rows, error }, { data: memberships }] = await Promise.all([
    supabase
      .from('communities')
      .select('*')
      .or(`name.ilike.${pattern},short_name.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
      .order('member_count', { ascending: false })
      .limit(limit),
    supabase.from('community_members').select('community_id').eq('user_id', userId),
  ]);
  if (error) throw error;
  const joinedIds = new Set((memberships ?? []).map((m) => m.community_id));
  return (rows ?? []).map((r) => communityRowToCommunity(r, joinedIds.has(r.id)));
}

export async function listCommunities(userId: string, offset = 0, limit = PAGE_SIZE): Promise<Page<Community>> {
  const [{ data: rows, error }, { data: memberships }] = await Promise.all([
    supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1),
    supabase.from('community_members').select('community_id').eq('user_id', userId),
  ]);
  if (error) throw error;
  const joinedIds = new Set((memberships ?? []).map((m) => m.community_id));
  const page = toPage(rows, limit);
  return { rows: page.rows.map((r) => communityRowToCommunity(r, joinedIds.has(r.id))), hasMore: page.hasMore };
}

export async function createCommunity(input: {
  createdBy: string;
  shortName: string;
  name: string;
  description: string;
  location?: string;
  logoUrl?: string;
  tags?: string[];
}): Promise<Community> {
  const { data, error } = await supabase
    .from('communities')
    .insert({
      created_by: input.createdBy,
      short_name: input.shortName,
      name: input.name,
      description: input.description,
      location: input.location,
      logo_url: input.logoUrl,
      tags: input.tags,
    })
    .select()
    .single();
  if (error) throw error;
  // The creator hasn't joined community_members yet (no auto-join trigger, unlike
  // chatrooms) — the caller (communitiesStore) is responsible for joining right after.
  return communityRowToCommunity(data, false);
}

export async function updateCommunity(
  id: string,
  patch: { name?: string; description?: string; location?: string; logoUrl?: string; tags?: string[] },
): Promise<Community> {
  const { data, error } = await supabase
    .from('communities')
    .update({
      name: patch.name,
      description: patch.description,
      location: patch.location,
      logo_url: patch.logoUrl,
      tags: patch.tags,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return communityRowToCommunity(data, false);
}

/** RLS (communities_delete_own) already scopes this to the creator or an admin. Cascades:
 * community_members rows are removed (on delete cascade); any linked chatroom's
 * community_id is set to null rather than the room itself being deleted. */
export async function deleteCommunity(id: string): Promise<void> {
  const { error } = await supabase.from('communities').delete().eq('id', id);
  if (error) throw error;
}

export async function joinCommunity(userId: string, communityId: string): Promise<void> {
  const { error } = await supabase.from('community_members').insert({ community_id: communityId, user_id: userId });
  if (error) throw error;
}

export async function leaveCommunity(userId: string, communityId: string): Promise<void> {
  const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
  if (error) throw error;
}
