export type DayPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

/** Fixed local-time ranges so the greeting is predictable:
 * 05:00–11:59 Morning · 12:00–16:59 Afternoon · 17:00–20:59 Evening · 21:00–04:59 Night. */
export function dayPeriod(date: Date): DayPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}
