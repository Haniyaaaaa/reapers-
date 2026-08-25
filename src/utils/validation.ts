import { colors } from '../theme';

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
