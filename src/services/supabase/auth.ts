import * as WebBrowser from 'expo-web-browser';
import { supabase } from './client';

// The app's existing deep-link scheme (app.json `scheme: "reapers"`) doubles as the OAuth
// redirect target — no native Google/Apple SDK, no app.json bundle-identifier or plugin
// config, and no Apple Developer / Google Cloud account registration required by this code.
// Google/Apple client IDs and secrets are configured server-side, in the Supabase dashboard
// (Authentication > Providers) against *your own* project — never inside this repo — so
// nothing here can end up pointing at the wrong client's account.
const OAUTH_REDIRECT_URL = 'reapers://auth-callback';

export type SignUpFields = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
};

/** Extra fields ride in options.data (raw_user_meta_data) — the handle_new_user trigger
 * (supabase/migrations/0012_onboarding_addendum.sql) reads them to seed the profile row
 * with a real username/first/last/phone instead of only deriving one from the email. */
export async function signUpWithEmail(fields: SignUpFields) {
  const { data, error } = await supabase.auth.signUp({
    email: fields.email,
    password: fields.password,
    options: {
      data: {
        username: fields.username,
        first_name: fields.firstName,
        last_name: fields.lastName,
        phone: fields.phone || undefined,
      },
    },
  });
  if (error) throw error;
  // Supabase deliberately does NOT return an error for an email that's already registered
  // and confirmed — it returns a fake success (session: null, a user with an empty
  // `identities` array) so signup can't be used to enumerate which emails exist. Without
  // this check that's indistinguishable from a real new signup, and the UI would sail the
  // user on to VerifyEmail waiting on a code that was never sent.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Try logging in instead.');
  }
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Emails a 6-digit recovery code (no deep link / redirectTo involved — the whole reset
 * happens in-app). Requires the project's "Reset Password" email template to render
 * `{{ .Token }}` as a visible code, the same content-only caveat as verifySignupOtp below. */
export async function sendPasswordResetOtp(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export const sendPasswordResetEmail = sendPasswordResetOtp;

/** Supabase has no `resend({ type: 'recovery' })` — re-requesting the reset is what reissues
 * the code, same call as sendPasswordResetOtp. */
export const resendPasswordResetOtp = sendPasswordResetOtp;

/** Verifies the recovery code and exchanges it for a real (recovery) session — needed before
 * updatePassword will succeed, since that call acts on the currently authenticated user. */
export async function verifyPasswordResetOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Confirms a fresh signup with the 6-digit code from the confirmation email. Works whether
 * the project's "Confirm signup" template shows a link or a raw token — the token is issued
 * either way; showing it to the user as a short code just needs the template edited (a
 * project-dashboard content change, not something this code controls). On success this
 * returns a real session, which authStore's existing onAuthStateChange listener picks up. */
export async function verifySignupOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) throw error;
  return data;
}

export async function resendSignupOtp(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

async function signInWithOAuthProvider(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase did not return an OAuth URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in was cancelled.');
  }

  const fragment = result.url.split('#')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('The sign-in redirect was missing session tokens.');
  }

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) throw sessionError;
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

export async function signInWithApple() {
  return signInWithOAuthProvider('apple');
}

