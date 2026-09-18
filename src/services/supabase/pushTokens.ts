import { supabase } from './client';

export async function registerPushToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await supabase.from('push_tokens').upsert({ user_id: userId, token, platform }, { onConflict: 'user_id,token' });
  if (error) throw error;
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  if (error) throw error;
}
