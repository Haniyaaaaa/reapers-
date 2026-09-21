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
