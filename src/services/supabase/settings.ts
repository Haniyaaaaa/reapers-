import { supabase } from './client';
import type { UserSettingsRow } from './types';

export async function getSettings(userId: string): Promise<UserSettingsRow> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateSettings(
  userId: string,
  patch: Partial<Pick<UserSettingsRow, 'notify_chat' | 'notify_events' | 'notify_demos' | 'notify_bookings' | 'discoverable'>>,
): Promise<UserSettingsRow> {
  const { data, error } = await supabase.from('user_settings').update(patch).eq('user_id', userId).select().single();
  if (error) throw error;
  return data;
}

export type BlockedUser = { id: string; displayName: string };

export async function listBlockedUsers(userId: string): Promise<BlockedUser[]> {
  // blocked_users has two FKs to profiles (blocker_id, blocked_id) — same PGRST201 ambiguous-
  // embed class as events.ts's EVENT_SELECT, disambiguated the same way.
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id, profiles!blocked_users_blocked_id_fkey(display_name)')
    .eq('blocker_id', userId);
  if (error) throw error;
  return (data as unknown as { blocked_id: string; profiles: { display_name: string } | null }[]).map((r) => ({
    id: r.blocked_id,
    displayName: r.profiles?.display_name ?? 'Someone',
  }));
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw error;
}
