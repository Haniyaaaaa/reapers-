import type { FilterState } from '../components/cyber/CyberFilterModal';
import type { GameEvent } from '../types/event';
import { distanceKm } from './geo';

const NEARBY_RADIUS_KM = 50;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function matchesDate(startsAt: string, date: string, customDate?: string): boolean {
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
    case 'CUSTOM':
      // No date picked yet passes everything through rather than hiding the whole list while
      // the user is still choosing a day in the sheet.
      return !customDate || isSameCalendarDay(d, new Date(customDate));
    default:
      return true;
  }
}

/** `viewerCoords` is optional — when the "WITHIN 50KM" option is picked but the viewer hasn't
 * granted location (or it hasn't loaded yet), this passes every event through rather than
 * hiding everything on a permission gap. Events with no coordinates of their own (online
 * events, or physical ones created before geo-tagging existed) are excluded from a real
 * distance filter — a genuinely unknown distance isn't "within" anything. */
function matchesLocation(event: GameEvent, location: string, viewerCoords?: { lat: number; lng: number }): boolean {
  switch (location) {
    case 'ANYWHERE':
      return true;
    case 'ONLINE':
      return event.type === 'Online';
    case 'BERLIN':
      return (event.location ?? '').toLowerCase().includes('berlin');
    case 'WITHIN 50KM': {
      if (!viewerCoords) return true;
      if (event.lat == null || event.lng == null) return false;
      return distanceKm(viewerCoords.lat, viewerCoords.lng, event.lat, event.lng) <= NEARBY_RADIUS_KM;
    }
    default:
      return true;
  }
}

function matchesCategory(event: GameEvent, category: string): boolean {
  const needle = category.toLowerCase();
  const eventCategory = (event.category ?? '').toLowerCase();
  const eventTitle = event.title.toLowerCase();
  return eventCategory.includes(needle) || eventTitle.includes(needle);
}

export function matchesEventFilters(event: GameEvent, filters: FilterState, viewerCoords?: { lat: number; lng: number }): boolean {
  return (
    matchesDate(event.startsAt, filters.date, filters.customDate) &&
    matchesLocation(event, filters.location, viewerCoords) &&
    matchesCategory(event, filters.category)
  );
}
