import type { ExpertSlot } from '../types/extra';

export type WeeklyAvailability = { weekday: number; slots: { start: string; end: string }[] }[];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatSlotTime(hour: number, minute: number) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hr = ((hour + 11) % 12) + 1;
  return `${hr}:${pad(minute)} ${ampm}`;
}

export function parseSlot(day: string, time: string) {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') hour += 12;
  const [y, mo, da] = day.split('-').map(Number);
  return new Date(y, mo - 1, da, hour, Number(m[2]), 0);
}

export function monthGrid(year: number, month: number) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = [
  { weekday: 0, slots: [{ start: '10:00', end: '18:00' }] }, // Sun
  { weekday: 1, slots: [{ start: '09:00', end: '18:00' }] }, // Mon
  { weekday: 2, slots: [{ start: '09:00', end: '18:00' }] }, // Tue
  { weekday: 3, slots: [{ start: '09:00', end: '18:00' }] }, // Wed
  { weekday: 4, slots: [{ start: '09:00', end: '18:00' }] }, // Thu
  { weekday: 5, slots: [{ start: '09:00', end: '18:00' }] }, // Fri
  { weekday: 6, slots: [{ start: '10:00', end: '18:00' }] }, // Sat
];

export function resolveWeeklyAvailability(availability?: WeeklyAvailability | null): WeeklyAvailability {
  if (availability && availability.length > 0) {
    return availability;
  }
  return DEFAULT_WEEKLY_AVAILABILITY;
}

/** Generates the bookable 15-min slots for one calendar date from the expert's persisted
 * weekday-pattern availability (or defaults to standard availability if the expert has not
 * configured custom hours yet). */
export function buildDaySlots(dateKey: string, now = new Date(), booked: ExpertSlot[] = [], availability: WeeklyAvailability = []): ExpertSlot[] {
  const effectiveAvailability = resolveWeeklyAvailability(availability);
  const today = dayKey(now);
  const taken = new Set(booked.filter((s) => s.day === dateKey && !s.available).map((s) => s.time));
  const [y, mo, da] = dateKey.split('-').map(Number);
  const weekday = new Date(y, mo - 1, da).getDay();
  const ranges = effectiveAvailability.find((a) => a.weekday === weekday)?.slots ?? [];

  const slots: ExpertSlot[] = [];
  for (const range of ranges) {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    let h = startH;
    let min = startM;
    while (h < endH || (h === endH && min < endM)) {
      const time = formatSlotTime(h, min);
      const when = parseSlot(dateKey, time);
      const past = dateKey < today || (dateKey === today && when != null && when.getTime() < now.getTime());
      slots.push({ day: dateKey, time, available: !past && !taken.has(time) });
      min += 15;
      if (min >= 60) {
        min = 0;
        h += 1;
      }
    }
  }
  return slots;
}

export function googleCalUrl(title: string, details: string, day: string, time: string) {
  const start = parseSlot(day, time);
  if (!start) return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}`;
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${stamp(start)}/${stamp(end)}`;
}
