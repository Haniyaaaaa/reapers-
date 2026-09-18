import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Real online presence via Supabase Realtime's Presence feature — one shared channel every
 * signed-in client tracks itself on (keyed by their own user id), so every other client's
 * `presenceState()` genuinely reflects who currently has the app open. This replaces what were
 * previously hardcoded "🟢 ONLINE" badges/dots that showed for every user regardless of
 * whether they were actually connected. */
const CHANNEL_NAME = 'presence:online-users';

let channel: RealtimeChannel | null = null;
let refCount = 0;
const listeners = new Set<(ids: Set<string>) => void>();
let onlineIds = new Set<string>();

function computeOnlineIds(): Set<string> {
  if (!channel) return new Set();
  const state = channel.presenceState<{ user_id: string }>();
  const ids = new Set<string>();
  for (const presences of Object.values(state)) {
    for (const p of presences) ids.add(p.user_id);
  }
  return ids;
}

function notify() {
  onlineIds = computeOnlineIds();
  listeners.forEach((l) => l(onlineIds));
}

/** Call once per signed-in session (e.g. in RootNavigator, gated on `user`). Returns a cleanup
 * function to stop tracking — safe to call multiple times concurrently (e.g. StrictMode double
 * effects): the underlying channel is refcounted and only actually torn down when the last
 * caller cleans up. */
export function joinPresence(userId: string): () => void {
  refCount += 1;
  if (!channel) {
    channel = supabase.channel(CHANNEL_NAME, { config: { presence: { key: userId } } });
    channel
      .on('presence', { event: 'sync' }, notify)
      .on('presence', { event: 'join' }, notify)
      .on('presence', { event: 'leave' }, notify)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel?.track({ user_id: userId }).catch(() => undefined);
        }
      });
  }
  return () => {
    refCount -= 1;
    if (refCount <= 0) {
      channel?.unsubscribe();
      channel = null;
      onlineIds = new Set();
    }
  };
}

export function subscribeOnlineUsers(cb: (ids: Set<string>) => void): () => void {
  listeners.add(cb);
  cb(onlineIds);
  return () => listeners.delete(cb);
}

export function isUserOnline(userId: string): boolean {
  return onlineIds.has(userId);
}
