import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
  ResetPassword: { email: string };
  SetNewPassword: { email: string };
};

export type TabParamList = {
  CommunitiesTab: undefined;
  EventsTab: undefined;
  HomeTab: undefined;
  DemosTab: undefined;
  ExpertsTab: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ChatDirectory: undefined;
  ChatDetail: { id: string };
  CreateRoom: undefined;
  EventHub: undefined;
  EventDetail: { id: string };
  CreateEvent: { eventId?: string } | undefined;
  DemoUpload: undefined;
  DemoDetail: { id: string };
  ExpertProfile: { id: string };
  ExpertsList: { mode: 'top_rated' | 'recommended' };
  Network: undefined;
  PeopleList: undefined;
  Profile: { id?: string };
  Settings: undefined;
  Notifications: undefined;
  Communities: undefined;
  CommunityDetail: { id: string };
  CreateHub: undefined;
  PostTeamRequest: { editId?: string } | undefined;
  TeamRequestsList: undefined;
  BecomeExpert: undefined;
  MyBookings: undefined;
  MyPosts: undefined;
  MyEvents: undefined;
  MyDemos: undefined;
  Connections: undefined;
  TeamRequestApplicants: { teamRequestId: string };
  TeamRequestDetail: { id: string };
  MyTeamRequests: undefined;
  RoomMembers: { roomId: string };
  RoomMedia: { roomId: string };
  RoomStarred: { roomId: string; tab?: 'starred' | 'pinned' };
  RoomInvites: undefined;
  RoomJoinRequests: { roomId: string };
  EventApplications: { eventId: string };
  MyEventApplications: undefined;
  CreateCommunity: undefined;
  ExpertAvailability: undefined;
  Subscription: undefined;
  PaymentResult: { orderId: string } | undefined;
  Support: undefined;
  SupportTicketDetail: { id: string };
};

// The admin console's own bottom-tab bar — a deliberately distinct shell from TabParamList
// (see AdminTabBar.tsx), not nested inside MainStackParamList at all: admins get a sibling
// top-level route in RootStackParamList instead of a buried Settings screen.
export type AdminTabParamList = {
  AdminOverview: undefined;
  AdminApprovals: undefined;
  AdminUsersTab: undefined;
  AdminBilling: undefined;
  AdminSupportTab: undefined;
};

export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
  AdminUserDetail: { id: string };
  AdminTicketDetail: { id: string };
  ManualOnboardExpert: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  PendingApproval: undefined;
  AdminConsole: undefined;
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
