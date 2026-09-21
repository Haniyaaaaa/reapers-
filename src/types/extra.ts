import type { TeamCompensation, TeamStage, TeamWorkMode } from '../services/supabase/types';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  target:
    | { screen: 'ChatDetail'; id: string }
    | { screen: 'EventDetail'; id: string }
    | { screen: 'CommunityDetail'; id: string }
    | { screen: 'DemoDetail'; id: string }
    | { screen: 'ExpertProfile'; id: string }
    | { screen: 'Network' }
    | { screen: 'Profile'; id?: string }
    | { screen: 'SupportTicketDetail'; id: string }
    | { screen: 'RoomInvites' }
    | { screen: 'RoomJoinRequests'; id: string }
    | { screen: 'EventHub' }
    | { screen: 'EventApplications'; id: string }
    | { screen: 'ExpertAvailability' }
    | { screen: 'BecomeExpert' }
    | { screen: 'MyBookings' }
    | { screen: 'TeamRequestApplicants'; id: string };
};

export type Review = {
  id: string;
  demoId: string;
  reviewerId: string;
  reviewer: string;
  avatarId?: string;
  scores: { gameplay: number; art: number; concept: number; polish: number };
  comment: string;
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | null;
  createdAt: string;
};

export type DemoComment = {
  id: string;
  demoId: string;
  userId: string;
  userName: string;
  avatarId?: string;
  text: string;
  createdAt: string;
  likes: number;
};

export type TeamRequest = {
  id: string;
  posterId: string;
  posterAvatarUri?: string;
  posterAvatarId?: string;
  posterName?: string;
  createdAt?: string;
  project: string;
  roles: string[];
  excerpt: string;
  studio?: string;
  teamSize?: number;
  stage?: TeamStage;
  engine?: string;
  location?: string;
  hoursPerWeek?: number;
  compensation?: TeamCompensation;
  /** YYYY-MM-DD — when the role is needed. */
  neededBy?: string;
  workMode?: TeamWorkMode;
  /** Only set on the poster's own list (My team requests). */
  applicantCount?: number;
};

export type PersonCard = {
  id: string;
  displayName: string;
  avatarUri?: string;
  avatarId?: string;
  roles: string[];
  skills: string[];
  connect: 'connect' | 'pending' | 'connected';
};

export type TeamApplicant = {
  id: string;
  displayName: string;
  avatarUri?: string;
  avatarId?: string;
  roles: string[];
  skills: string[];
  appliedAt: string;
};

export type ExpertSlot = {
  day: string;
  time: string;
  available: boolean;
};

export type BookingSummary = {
  id: string;
  startsAt: string;
  status: string;
  expertId: string;
  expertName: string;
  expertMeetingLink?: string;
  requesterId: string;
  requesterName: string;
  role: 'requester' | 'expert';
};
