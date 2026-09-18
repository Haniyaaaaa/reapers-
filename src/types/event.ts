export type EventType = 'Online' | 'Physical';
export type EventCategory = 'Esports' | 'Meetup' | 'LAN' | 'Workshop' | 'Tournament' | 'Watch party';
export type RsvpStatus = 'going' | 'interested' | 'not_going' | null;

export type GameEvent = {
  id: string;
  hostId: string;
  title: string;
  description: string;
  type: EventType;
  category?: EventCategory;
  startsAt: string;
  location: string;
  lat?: number;
  lng?: number;
  cover: string;
  posterName: string;
  attendeeCount: number;
  maxAttendees?: number;
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
  createdAt: string;
};
