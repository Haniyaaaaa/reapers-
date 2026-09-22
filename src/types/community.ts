import type { ImageSourcePropType } from 'react-native';

export type Community = {
  id: string;
  createdBy: string | null;
  shortName: string;
  name: string;
  description: string;
  logo: ImageSourcePropType;
  logoUrl?: string;
  memberCount: number;
  joined: boolean;
  location?: string;
  tags: string[];
  rules?: string;
};
