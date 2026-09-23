import { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reapers://', 'https://reapers.pk'],
  config: {
    screens: {
      Splash: 'splash',
      Auth: 'auth',
      Onboarding: 'onboarding',
      PendingApproval: 'pending-approval',
      Main: {
        screens: {
          Tabs: {
            screens: {
              HomeTab: 'home',
              DemosTab: 'demos',
              ExpertsTab: 'experts',
            },
          },
          ChatDirectory: 'chatrooms',
          EventHub: 'events',
          EventDetail: 'events/:id',
          EventApplications: 'events/:eventId/applications',
          MyEventApplications: 'my-event-applications',
          DemoDetail: 'demo/:id',
          ChatDetail: 'chat/:id',
          Communities: 'communities',
          CommunityDetail: 'communities/:id',
          ExpertProfile: 'experts/:id',
          Network: 'network',
          Notifications: 'notifications',
          Profile: 'profile/:id',
          Subscription: 'subscription',
          PaymentResult: 'payment-result',
          RoomMembers: 'chat/:roomId/members',
          RoomInvites: 'room-invites',
          RoomJoinRequests: 'chat/:roomId/join-requests',
          SupportTicketDetail: 'support/:id',
          PostDetail: 'post/:id',
        },
      },
    },
  },
};
