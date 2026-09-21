export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDateBlock(iso: string) {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
  };
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameDay(isoA: string, isoB: string): boolean {
  return isSameCalendarDay(new Date(isoA), new Date(isoB));
}

/** WhatsApp-style day label for the floating date pill between messages: "Today", "Yesterday",
 * or a full date — with the year only shown once it's no longer the current year. */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameCalendarDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(d, yesterday)) return 'Yesterday';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}
