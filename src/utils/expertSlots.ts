import type { ExpertSlot } from '../types/extra';

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

export function buildDaySlots(dateKey: string, now = new Date(), booked: ExpertSlot[] = []): ExpertSlot[] {
  const today = dayKey(now);
  const taken = new Set(booked.filter((s) => s.day === dateKey && !s.available).map((s) => s.time));
  const slots: ExpertSlot[] = [];
  for (let h = 0; h < 24; h++) {
    for (const min of [0, 15, 30, 45]) {
      const time = formatSlotTime(h, min);
      const when = parseSlot(dateKey, time);
      const past = dateKey < today || (dateKey === today && when != null && when.getTime() < now.getTime());
      slots.push({ day: dateKey, time, available: !past && !taken.has(time) });
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
