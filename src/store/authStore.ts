import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import * as authApi from '../services/supabase/auth';
import { supabase } from '../services/supabase/client';
import { getProfile, profileRowToUser, updateProfile } from '../services/supabase/profiles';
import { upsertExpertApplication } from '../services/supabase/experts';
import { uploadAvatarIfLocal } from '../services/supabase/storage';
import { registerForPushNotifications, unregisterCurrentPushToken } from '../services/notifications/registerForPush';
import { clearIdentity, identifyUser, track } from '../services/analytics/analytics';
import { deleteAccount as deleteAccountApi } from '../services/supabase/account';
import type { SignUpFields } from '../services/supabase/auth';
import type { User } from '../types/user';

type AuthState = {
  hydrated: boolean;
  session: Session | null;
  user: User | null;
  onboarded: boolean;
  authError: string | null;
  // True from the moment a password-reset code is verified until the new password is saved.
  // RootNavigator keeps the user on the Auth stack while this is set even though `session`
  // is already non-null (verifyOtp signs them in) — otherwise they'd get yanked into the
  // app mid-reset, still on their old password.
  passwordRecovery: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (fields: SignUpFields) => Promise<{ session: Session | null }>;
  verifyEmail: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendPasswordReset: (email: string) => Promise<void>;
  verifyPasswordReset: (email: string, token: string) => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<void>;
  cancelPasswordRecovery: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  completeOnboarding: (
    partial: Partial<User>,
    expertApplication?: {
      role: string;
      company: string;
      bio: string;
      specialties: string[];
      portfolioUrl?: string;
      linkedinUrl?: string;
    }
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

let authListenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  session: null,
  user: null,
  onboarded: false,
  authError: null,
  passwordRecovery: false,

  bootstrap: async () => {
    if (authListenerRegistered) return;
    authListenerRegistered = true;

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        const row = await getProfile(data.session.user.id);
        set({
          session: data.session,
          user: profileRowToUser(row, data.session.user.email ?? ''),
          onboarded: row.onboarded,
          hydrated: true,
        });
      } catch {
        set({ session: data.session, hydrated: true });
      }
    } else {
      set({ hydrated: true });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        set({ session: null, user: null, onboarded: false, passwordRecovery: false });
        return;
      }
      try {
        const row = await getProfile(session.user.id);
        set({ session, user: profileRowToUser(row, session.user.email ?? ''), onboarded: row.onboarded });
      } catch {
        set({ session });
      }
      if (event === 'SIGNED_IN') {
        // Re-registers on every sign-in (including a re-login on a new device); resolves to
        // null and does nothing if no EAS project is attached yet — never blocks sign-in.
        registerForPushNotifications(session.user.id).catch(() => undefined);
        identifyUser(session.user.id);
      }
    });
  },

  login: async (email, password) => {
    set({ authError: null });
    try {
      await authApi.signInWithEmail(email, password);
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Login failed' });
      throw err;
    }
  },

  signup: async (fields) => {
    set({ authError: null });
    try {
      const data = await authApi.signUpWithEmail(fields);
      track('signup');
      return { session: data.session };
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Sign up failed' });
      throw err;
    }
  },

  verifyEmail: async (email, token) => {
    set({ authError: null });
    try {
      await authApi.verifySignupOtp(email, token);
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Invalid or expired code' });
      throw err;
    }
  },

  resendVerification: async (email) => {
    set({ authError: null });
    try {
      await authApi.resendSignupOtp(email);
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Could not resend code' });
      throw err;
    }
  },

  requestPasswordReset: async (email) => {
    set({ authError: null });
    try {
      await authApi.sendPasswordResetOtp(email);
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Could not send reset code' });
      throw err;
    }
  },

  resendPasswordReset: async (email) => {
    set({ authError: null });
    try {
      await authApi.resendPasswordResetOtp(email);
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Could not resend code' });
      throw err;
    }
  },

  verifyPasswordReset: async (email, token) => {
    set({ authError: null });
    try {
      const data = await authApi.verifyPasswordResetOtp(email, token);
      // Set together so RootNavigator's gate never sees session=true with
      // passwordRecovery still false, even for one render.
      set({ session: data.session, passwordRecovery: true });
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Invalid or expired code' });
      throw err;
    }
  },

  completePasswordReset: async (newPassword) => {
    set({ authError: null });
    try {
      await authApi.updatePassword(newPassword);
      set({ passwordRecovery: false });
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Could not update password' });
      throw err;
    }
  },

  // Lets the user back out of a code-verified-but-password-not-yet-set state (e.g. they hit
  // "Cancel") without leaving a dangling recovery session behind.
  cancelPasswordRecovery: async () => {
    set({ passwordRecovery: false });
    await authApi.signOut().catch(() => undefined);
    set({ session: null, user: null, onboarded: false });
  },

  loginWithGoogle: async () => {
    set({ authError: null });
    try {
      await authApi.signInWithGoogle();
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Google sign-in failed' });
      throw err;
    }
  },

  loginWithApple: async () => {
    set({ authError: null });
    try {
      await authApi.signInWithApple();
    } catch (err) {
      set({ authError: err instanceof Error ? err.message : 'Apple sign-in failed' });
      throw err;
    }
  },

  completeOnboarding: async (partial, expertApplication) => {
    const session = get().session;
    if (!session) throw new Error('No active session');
    const withUploadedAvatar = await uploadAvatarIfLocal(session.user.id, partial);
    // approvalStatus: 'pending' only ever takes effect server-side when the account was
    // previously 'rejected' (resubmission) — the enforce_profile_immutable_columns trigger
    // strips it back to the current value for every other case, so it's always safe to send.
    const row = await updateProfile(session.user.id, { ...withUploadedAvatar, onboarded: true, approvalStatus: 'pending' });
    set({ user: profileRowToUser(row, session.user.email ?? ''), onboarded: true });
    if (expertApplication) {
      await upsertExpertApplication({
        id: session.user.id,
        role: expertApplication.role,
        company: expertApplication.company,
        bio: expertApplication.bio,
        specialties: expertApplication.specialties,
        portfolio_url: expertApplication.portfolioUrl || null,
        linkedin_url: expertApplication.linkedinUrl || null,
      });
    }
    // Matches the spec's "notification permission prompt" as the true last onboarding step —
    // a no-op if already granted/denied or if push isn't configured yet (see registerForPush.ts).
    registerForPushNotifications(session.user.id).catch(() => undefined);
  },

  logout: async () => {
    const userId = get().session?.user.id;
    if (userId) await unregisterCurrentPushToken(userId);
    await authApi.signOut();
    clearIdentity();
    set({ session: null, user: null, onboarded: false, passwordRecovery: false });
  },

  deleteAccount: async () => {
    const userId = get().session?.user.id;
    await deleteAccountApi();
    if (userId) await unregisterCurrentPushToken(userId).catch(() => undefined);
    clearIdentity();
    set({ session: null, user: null, onboarded: false, passwordRecovery: false });
  },

  // Re-pulls this user's own profile row — needed anywhere a server-side change made by
  // someone else (an admin approving/rejecting the account, or its expert application)
  // should show up without a full logout/login. No realtime subscription exists for
  // profiles, so screens that care (ProfileScreen's own view) call this on focus.
  refreshUser: async () => {
    const session = get().session;
    if (!session) return;
    try {
      const row = await getProfile(session.user.id);
      set({ user: profileRowToUser(row, session.user.email ?? ''), onboarded: row.onboarded });
    } catch {
      // Best-effort — leave the existing cached user in place on failure.
    }
  },
}));
