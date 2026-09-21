const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function timeStr(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
function dayStr(d: Date): string {
  return `${WEEKDAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** "Sat, 19 Sep · 6:00 PM – 8:00 PM (2h)", or with both dates when it spans days. Falls back to
 * just the start for events created before end times existed. */
export function formatEventRange(startIso: string, endIso?: string, withDuration = false): string {
  const s = new Date(startIso);
  if (Number.isNaN(s.getTime())) return '';
  if (!endIso) return `${dayStr(s)} · ${timeStr(s)}`;
  const e = new Date(endIso);
  const dur = withDuration ? ` (${formatDuration(startIso, endIso)})` : '';
  if (sameDay(s, e)) return `${dayStr(s)} · ${timeStr(s)} – ${timeStr(e)}${dur}`;
  return `${dayStr(s)}, ${timeStr(s)} → ${dayStr(e)}, ${timeStr(e)}${dur}`;
}
