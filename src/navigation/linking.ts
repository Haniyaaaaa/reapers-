import { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reapers://', 'https://reapers.app'],
  config: {
    screens: {
      Splash: 'splash',
      Auth: 'auth',
      Onboarding: 'onboarding',
      Main: {
        screens: {
          Tabs: {
            screens: {
              HomeTab: 'home',
              ChatTab: 'chatrooms',
              DemosTab: 'demos',
              ExpertsTab: 'experts',
            },
          },
          EventHub: 'events',
          EventDetail: 'events/:id',
          DemoDetail: 'demo/:id',
          ChatDetail: 'chat/:id',
          Communities: 'communities',
          CommunityDetail: 'communities/:id',
          ExpertProfile: 'experts/:id',
          Network: 'network',
          Notifications: 'notifications',
        },
      },
    },
  },
};
