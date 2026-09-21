export type EventType = 'Online' | 'Physical' | 'Hybrid';
/** Free text — the create form offers presets but also lets hosts type their own category. */
export type EventCategory = string;
export type RsvpStatus = 'going' | 'interested' | 'not_going' | null;

export type GameEvent = {
  id: string;
  hostId: string;
  title: string;
  description: string;
  type: EventType;
  category?: EventCategory;
  startsAt: string;
  endsAt?: string;
  location: string;
  lat?: number;
  lng?: number;
  cover: string;
  posterName: string;
  posterAvatarUri?: string;
  posterAvatarId?: string;
  attendeeCount: number;
  maxAttendees?: number;
  /** Minutes before the start that sign-ups stop (0 = open until it starts). */
  registrationClosesBeforeMin?: number;
  rsvp: RsvpStatus;
  paid?: boolean;
  price?: number;
  currency?: string;
  paidByUser?: boolean;
  /** Free-text note the host shows attendees for payment — deliberately not structured bank
   * fields (account/IBAN). Storing raw bank details with no real payment processor attached
   * is unjustified liability; replace this with processor-tokenized data when real payments
   * (Stripe Connect or similar) are integrated. */
  payoutContactNote?: string;
};

export type PayoutAccount = {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
};

export type EventApplicationStatus = 'pending' | 'approved' | 'rejected';

export type EventPaymentApplication = {
  id: string;
  eventId: string;
  eventTitle?: string;
  applicantId: string;
  applicantName: string;
  applicantAvatarUri?: string;
  applicantAvatarId?: string;
  payoutAccountId?: string;
  proofScreenshotPath: string;
  status: EventApplicationStatus;
  rejectionReason?: string;
  reservationCode?: string;
  planName?: string;
  unitPrice?: number;
  quantity: number;
  totalAmount?: number;
  createdAt: string;
};

/** One purchasable ticket type for a paid event. */
export type TicketPlan = {
  /** Undefined for the implicit plan of events created before plans existed. */
  id?: string;
  name: string;
  price: number;
};

export const MAX_TICKETS_PER_ORDER = 10;

export const REGISTRATION_CLOSE_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'When it starts' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 180, label: '3 hours before' },
  { minutes: 360, label: '6 hours before' },
  { minutes: 720, label: '12 hours before' },
  { minutes: 1440, label: '1 day before' },
  { minutes: 2880, label: '2 days before' },
  { minutes: 10080, label: '1 week before' },
];

/** When sign-ups stop for this event. */
export function registrationClosesAt(event: Pick<GameEvent, 'startsAt' | 'registrationClosesBeforeMin'>): Date {
  return new Date(new Date(event.startsAt).getTime() - (event.registrationClosesBeforeMin ?? 0) * 60000);
}
