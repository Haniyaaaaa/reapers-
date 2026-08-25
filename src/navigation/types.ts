import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ChatTab: undefined;
  DemosTab: undefined;
  ExpertsTab: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ChatDetail: { id: string };
  CreateRoom: undefined;
  EventHub: undefined;
  EventDetail: { id: string };
  CreateEvent: undefined;
  DemoUpload: undefined;
  DemoDetail: { id: string };
  ExpertProfile: { id: string };
  VideoCall: { id: string };
  Network: undefined;
  Profile: { id?: string };
  Settings: undefined;
  Notifications: undefined;
  Communities: undefined;
  CommunityDetail: { id: string };
  CreateHub: undefined;
  PostTeamRequest: undefined;
  BecomeExpert: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
