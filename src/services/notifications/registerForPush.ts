import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from '../supabase/pushTokens';

// Tracks the token this device last registered so logout() can clean it up specifically —
// without this, a signed-out device keeps its push token in the DB and would receive
// pushes meant for whoever's account is next signed in on it.
let lastRegisteredToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission and registers the resulting Expo push token against the
 * signed-in user. Safe to call even before any EAS project is attached — `getExpoPushTokenAsync`
 * needs an EAS `projectId` (set up later, by the user, under their own Expo account) to return
 * a real token; until then this resolves to `null` and does nothing rather than throwing, so
 * onboarding/login never breaks because push isn't configured yet.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens aren't meaningful on simulators/web

  // Android 8+ requires a notification channel for anything to display, and on Android 13+ the
  // permission prompt itself doesn't appear until at least one channel exists — so this has to
  // run before requestPermissionsAsync below. HIGH importance makes new-event pushes pop up as
  // a heads-up banner instead of arriving silently in the tray.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reapers',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00E5FF',
    }).catch(() => undefined);
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null; // no EAS project attached yet — nothing to register against

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerPushToken(userId, token, platform);
    lastRegisteredToken = token;
    return token;
  } catch {
    return null; // never let push registration failure break sign-in/onboarding
  }
}

/** Called from authStore's logout() before the session is cleared. No-ops cleanly if this
 * device never registered a token (push not configured, or permission was never granted). */
export async function unregisterCurrentPushToken(userId: string): Promise<void> {
  if (!lastRegisteredToken) return;
  try {
    await unregisterPushToken(userId, lastRegisteredToken);
  } catch {
    // Best-effort — logout must never fail because of this.
  } finally {
    lastRegisteredToken = null;
  }
}
