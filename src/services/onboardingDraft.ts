import AsyncStorage from '@react-native-async-storage/async-storage';

/** Answers entered so far in the onboarding wizard. The wizard used to keep everything in memory
 * and only write to the server on the very last step, so leaving mid-way (or the app being killed)
 * meant starting again from step 1. Saving it per user lets them resume where they left off. */
export type OnboardingDraft = {
  step: number;
  roles: string[];
  fullName: string;
  username: string;
  bio: string;
  linkedin: string;
  portfolio: string;
  company: string;
  expertRole: string;
  selectedTags: string[];
  selectedGames: string[];
  selectedGenres: string[];
  avatarId?: string;
  /** Only remote URLs are kept — a picked local photo path may not survive an app restart. */
  avatarUri?: string;
};

const key = (userId: string) => `onboarding-draft:${userId}`;

export async function loadOnboardingDraft(userId: string): Promise<OnboardingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as OnboardingDraft) : null;
  } catch {
    return null;
  }
}

export async function saveOnboardingDraft(userId: string, draft: OnboardingDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify(draft));
  } catch {
    // Best-effort — losing a draft must never block onboarding.
  }
}

export async function clearOnboardingDraft(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(userId));
  } catch {
    // Best-effort.
  }
}
