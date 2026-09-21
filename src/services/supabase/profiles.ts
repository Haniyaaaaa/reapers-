import { supabase } from './client';
import type { ProfileRow, ProfileUpdate } from './types';
import type { User } from '../../types/user';

/**
 * The rest of the app (screens/stores built pre-Supabase) consumes the camelCase `User`
 * shape from src/types/user.ts. Rather than rewrite every screen's field names to match
 * the DB's snake_case `profiles` row, this module is the single adapter boundary: it's the
 * only place that knows both shapes. Repository/store code elsewhere should always go
 * through `profileRowToUser`/`userPartialToProfileUpdate`, never read `profiles` rows raw.
 */
export function profileRowToUser(row: ProfileRow, email: string): User {
  return {
    id: row.id,
    email,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUri: row.avatar_uri ?? undefined,
    avatarId: row.avatar_id ?? undefined,
    avatarLook: row.avatar_look ?? undefined,
    roles: row.roles,
    skills: row.skills,
    games: row.games,
    tags: row.tags,
    portfolioUrl: row.portfolio_url ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    location: row.location ?? undefined,
    yearsExperience: row.years_experience ?? undefined,
    interests: row.interests,
    credibility: row.credibility,
    followers: row.followers_count,
    following: row.following_count,
    posts: row.posts_count,
    isExpert: row.is_expert,
    isAdmin: row.is_admin,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? undefined,
    approvalStatus: row.approval_status,
    approvalRejectionReason: row.approval_rejection_reason ?? undefined,
  };
}

function userPartialToProfileUpdate(partial: Partial<User>): ProfileUpdate {
  const update: ProfileUpdate = {};
  if (partial.username !== undefined) update.username = partial.username;
  if (partial.displayName !== undefined) update.display_name = partial.displayName;
  if (partial.bio !== undefined) update.bio = partial.bio;
  if (partial.avatarUri !== undefined) update.avatar_uri = partial.avatarUri || null; // '' clears a removed custom photo
  if (partial.avatarId !== undefined) update.avatar_id = partial.avatarId ?? null;
  if (partial.avatarLook !== undefined) update.avatar_look = partial.avatarLook ?? null;
  if (partial.roles !== undefined) update.roles = partial.roles;
  if (partial.skills !== undefined) update.skills = partial.skills;
  if (partial.games !== undefined) update.games = partial.games;
  if (partial.tags !== undefined) update.tags = partial.tags;
  if (partial.portfolioUrl !== undefined) update.portfolio_url = partial.portfolioUrl || null;
  if (partial.linkedinUrl !== undefined) update.linkedin_url = partial.linkedinUrl || null;
  if (partial.location !== undefined) update.location = partial.location ?? null;
  if (partial.yearsExperience !== undefined) update.years_experience = partial.yearsExperience ?? null;
  if (partial.interests !== undefined) update.interests = partial.interests;
  if (partial.firstName !== undefined) update.first_name = partial.firstName;
  if (partial.lastName !== undefined) update.last_name = partial.lastName;
  if (partial.phone !== undefined) update.phone = partial.phone || null;
  if (partial.approvalStatus !== undefined) update.approval_status = partial.approvalStatus;
  return update;
}

export async function getProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, partial: Partial<User> & { onboarded?: boolean }): Promise<ProfileRow> {
  const update = userPartialToProfileUpdate(partial);
  if (partial.onboarded !== undefined) update.onboarded = partial.onboarded;
  const { data, error } = await supabase.from('profiles').update(update).eq('id', userId).select().single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('That username is already taken.');
    }
    throw error;
  }
  return data;
}

export async function isUsernameAvailable(username: string, excludingUserId?: string): Promise<boolean> {
  let query = supabase.from('profiles').select('id').ilike('username', username);
  if (excludingUserId) query = query.neq('id', excludingUserId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) === 0;
}
