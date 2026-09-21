const EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

/** Countdown/status pill text for an event card, derived from its real start time. */
export function formatEventBadge(isoStr: string, endsIso?: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return 'SCHEDULED';
  const diffMs = d.getTime() - Date.now();
  // Real end time when the host set one; the old fixed 3h assumption only for older events.
  const end = endsIso ? new Date(endsIso).getTime() : NaN;
  const endedMs = Number.isNaN(end) ? d.getTime() + EVENT_DURATION_MS : end;
  if (Date.now() > endedMs) return 'ENDED';
  if (diffMs <= 0) return 'LIVE NOW';
  const diffHours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) return `STARTS IN ${diffHours}H`;
  return `STARTS ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
}
