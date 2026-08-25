export type Role = 'gamer' | 'developer';

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUri?: string;
  avatarId?: string;
  roles: Role[];
  skills: string[];
  games: string[];
  tags?: string[];
  portfolioUrl?: string;
  linkedinUrl?: string;
  location?: string;
  credibility: number;
  followers: number;
  following: number;
  posts: number;
  online?: boolean;
  avatarLook?: import('../data/gamerAvatars').AvatarLook;
};
