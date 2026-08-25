export type EventType = 'Online' | 'Physical';
export type EventCategory = 'Esports' | 'Meetup' | 'LAN' | 'Workshop' | 'Tournament' | 'Watch party';
export type RsvpStatus = 'going' | 'interested' | 'not_going' | null;

export type GameEvent = {
  id: string;
  title: string;
  description: string;
  type: EventType;
  category?: EventCategory;
  startsAt: string;
  location: string;
  cover: string;
  posterName: string;
  attendeeCount: number;
  rsvp: RsvpStatus;
  paid?: boolean;
  price?: number;
  currency?: string;
  paidByUser?: boolean;
  hostAccountName?: string;
  hostBankName?: string;
  hostAccountNumber?: string;
  hostIban?: string;
};
