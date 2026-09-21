import { colors } from '../theme';

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Collected but not SMS-verified (see the Onboarding & Admin Panel addendum) — a loose
// format check is enough since there's no verification step to gate on it.
export function isPhone(value: string) {
  return /^[+]?[\d\s()-]{7,20}$/.test(value.trim());
}

export function passwordStrength(value: string) {
  if (value.length < 8) return { ok: false, message: 'At least 8 characters' };
  if (!/[A-Z]/.test(value)) return { ok: false, message: 'Add an uppercase letter' };
  if (!/[0-9]/.test(value)) return { ok: false, message: 'Add a number' };
  return { ok: true, message: 'Strong password' };
}

export function fieldErrorColor(hasError: boolean) {
  return hasError ? colors.danger : colors.border;
}

const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

export function isUrl(value: string) {
  return URL_RE.test(value.trim());
}

export function isLinkedInUrl(value: string) {
  return isUrl(value) && /(^|\.|\/\/)linkedin\.com(\/|$)/i.test(value.trim());
}

/** Stores links with an explicit scheme so they open correctly wherever they're rendered. */
export function normalizeUrl(value: string) {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

export function isValidUsername(value: string) {
  return USERNAME_RE.test(value.trim().toLowerCase());
}
