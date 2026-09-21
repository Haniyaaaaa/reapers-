import type { FilterState } from '../components/cyber/CyberFilterModal';
import type { GameEvent } from '../types/event';

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function matchesDate(startsAt: string, date: string | null): boolean {
  if (!date) return true;
  const d = new Date(startsAt);
  const now = new Date();
  switch (date) {
    case 'TODAY':
      return isSameCalendarDay(d, now);
    case 'THIS WEEK': {
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      return d.getTime() >= now.getTime() && d.getTime() - now.getTime() <= weekMs;
    }
    case 'THIS MONTH':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    default:
      return true;
  }
}

/** Online / Onsite / Hybrid map onto the event's own format (Physical = Onsite). */
function matchesLocation(event: GameEvent, location: string | null): boolean {
  switch (location) {
    case 'ONLINE':
      return event.type === 'Online';
    case 'ONSITE':
      return event.type === 'Physical';
    case 'HYBRID':
      return event.type === 'Hybrid';
    default:
      return true;
  }
}

function matchesCategory(event: GameEvent, category: string | null): boolean {
  if (!category) return true;
  const needle = category.toLowerCase();
  const eventCategory = (event.category ?? '').toLowerCase();
  const eventTitle = event.title.toLowerCase();
  return eventCategory.includes(needle) || eventTitle.includes(needle);
}

export function matchesEventFilters(event: GameEvent, filters: FilterState): boolean {
  return matchesDate(event.startsAt, filters.date) && matchesLocation(event, filters.location) && matchesCategory(event, filters.category);
}
