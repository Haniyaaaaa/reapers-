export type Expert = {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  avatarId?: string;
  verified: boolean;
  specialties: string[];
  rating: number;
  reviewCount: number;
  nextSlot: string;
  bio: string;
  location?: string;
  yearsExperience?: number;
  linkedinUrl?: string;
  portfolioUrl?: string;
  work?: { title: string; company: string; years: string }[];
  /** Cal.com <username>/<event-type-slug> — when both are set, a booking's meeting link is
   * generated automatically (see supabase/functions/create-cal-booking) instead of the expert
   * typing one in after the fact. */
  calUsername?: string;
  calEventSlug?: string;
};

export const EXPERTISE_TAGS = ['Systems', 'Live ops', 'Shaders', 'VFX', 'Narrative', 'Combat', 'Netcode', 'UI', 'Animation', 'Audio'];

export type ExpertReview = {
  id: string;
  expertId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUri?: string;
  reviewerAvatarId?: string;
  rating: number;
  comment: string;
  createdAt: string;
};
