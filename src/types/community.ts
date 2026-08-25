import type { ImageSourcePropType } from 'react-native';

export type Community = {
  id: string;
  shortName: string;
  name: string;
  description: string;
  logo: ImageSourcePropType;
  memberCount: number;
  joined: boolean;
  location?: string;
};
