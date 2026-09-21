export type RubricScores = {
  gameplay: number;
  art: number;
  concept: number;
  polish: number;
};

export type Demo = {
  id: string;
  title: string;
  genre: string;
  description: string;
  thumbnail?: string;
  videoUrl?: string;
  durationSec: number;
  developerId: string;
  developerName: string;
  developerAvatar?: string;
  scores: RubricScores;
  reviewCount: number;
  externalUrl?: string;
  isJamEntry: boolean;
  playCount?: number;
  screenshotUrls?: string[];
  tags: string[];
  platforms: string[];
  portfolioUrl?: string;
  pressKitUrl?: string;
  createdAt: string;
};
