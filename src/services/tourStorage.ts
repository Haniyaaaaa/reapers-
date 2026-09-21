import AsyncStorage from '@react-native-async-storage/async-storage';

/** Whether this person has already seen (finished OR skipped) the app tour on this device. Kept per
 * user so a different account on the same phone still gets its own first-time tour. */
const key = (userId: string) => `app-tour-seen:${userId}`;

export async function hasSeenTour(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === '1';
  } catch {
    // If storage is unreadable, err on the side of NOT nagging with the tour.
    return true;
  }
}

export async function markTourSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), '1');
  } catch {
    // Best-effort.
  }
}
