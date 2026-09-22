import { supabase } from './client';
import type { NotificationRow } from './types';
import type { NotificationItem } from '../../types/extra';

type NotificationRowWithActor = NotificationRow & {
  actor: { avatar_uri: string | null; avatar_id: string | null } | null;
};

function notificationRowToItem(row: NotificationRowWithActor): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    target: row.target as NotificationItem['target'],
    actorId: row.actor_id,
    actorAvatarUri: row.actor?.avatar_uri ?? undefined,
    actorAvatarId: row.actor?.avatar_id ?? undefined,
  };
}

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(avatar_uri, avatar_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as NotificationRowWithActor[]).map(notificationRowToItem);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}
