export type DateBucket = 'ALL' | 'TODAY' | 'THIS WEEK' | 'THIS MONTH';
export const DATE_BUCKETS: DateBucket[] = ['ALL', 'TODAY', 'THIS WEEK', 'THIS MONTH'];

/** Shared "when did this happen" filter for My Posts / My Events / My Demos — same date-bucket
 * semantics as the event advanced-filter sheet (src/utils/eventFilters.ts), generalized to any
 * ISO timestamp instead of just event.startsAt. */
export function matchesDateBucket(iso: string, bucket: DateBucket): boolean {
  if (bucket === 'ALL') return true;
  const d = new Date(iso);
  const now = new Date();
  switch (bucket) {
    case 'TODAY':
      return d.toDateString() === now.toDateString();
    case 'THIS WEEK': {
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      return now.getTime() - d.getTime() <= weekMs && d.getTime() <= now.getTime();
    }
    case 'THIS MONTH':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    default:
      return true;
  }
}
