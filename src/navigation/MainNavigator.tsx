import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommunitiesScreen } from '../features/communities/screens/CommunitiesScreen';
import { CommunityDetailScreen } from '../features/communities/screens/CommunityDetailScreen';
import { CreateCommunityScreen } from '../features/communities/screens/CreateCommunityScreen';
import { ChatDetailScreen } from '../features/chat/screens/ChatDetailScreen';
import { ChatDirectoryScreen } from '../features/chat/screens/ChatDirectoryScreen';
import { CreateRoomScreen } from '../features/chat/screens/CreateRoomScreen';
import { RoomMembersScreen } from '../features/chat/screens/RoomMembersScreen';
import { RoomMediaScreen } from '../features/chat/screens/RoomMediaScreen';
import { RoomStarredScreen } from '../features/chat/screens/RoomStarredScreen';
import { RoomInvitesScreen } from '../features/chat/screens/RoomInvitesScreen';
import { RoomJoinRequestsScreen } from '../features/chat/screens/RoomJoinRequestsScreen';
import { CreateHubScreen } from '../features/create/screens/CreateHubScreen';
import { DemoDetailScreen } from '../features/demos/screens/DemoDetailScreen';
import { DemoUploadScreen } from '../features/demos/screens/DemoUploadScreen';
import { MyDemosScreen } from '../features/demos/screens/MyDemosScreen';
import { CreateEventScreen } from '../features/events/screens/CreateEventScreen';
import { EventApplicationsScreen } from '../features/events/screens/EventApplicationsScreen';
import { EventDetailScreen } from '../features/events/screens/EventDetailScreen';
import { EventHubScreen } from '../features/events/screens/EventHubScreen';
import { MyEventApplicationsScreen } from '../features/events/screens/MyEventApplicationsScreen';
import { MyEventsScreen } from '../features/events/screens/MyEventsScreen';
import { BecomeExpertScreen } from '../features/experts/screens/BecomeExpertScreen';
import { ExpertAvailabilityScreen } from '../features/experts/screens/ExpertAvailabilityScreen';
import { ExpertProfileScreen } from '../features/experts/screens/ExpertProfileScreen';
import { ExpertsListScreen } from '../features/experts/screens/ExpertsListScreen';
import { MyBookingsScreen } from '../features/experts/screens/MyBookingsScreen';
import { ConnectionsScreen } from '../features/network/screens/ConnectionsScreen';
import { NetworkScreen } from '../features/network/screens/NetworkScreen';
import { PeopleListScreen } from '../features/network/screens/PeopleListScreen';
import { PostTeamRequestScreen } from '../features/network/screens/PostTeamRequestScreen';
import { TeamRequestsListScreen } from '../features/network/screens/TeamRequestsListScreen';
import { TeamRequestApplicantsScreen } from '../features/network/screens/TeamRequestApplicantsScreen';
import { TeamRequestDetailScreen } from '../features/network/screens/TeamRequestDetailScreen';
import { MyTeamRequestsScreen } from '../features/network/screens/MyTeamRequestsScreen';
import { MyPostsScreen } from '../features/profile/screens/MyPostsScreen';
import { NotificationsScreen } from '../features/profile/screens/NotificationsScreen';
import { PaymentResultScreen } from '../features/profile/screens/PaymentResultScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { SettingsScreen } from '../features/profile/screens/SettingsScreen';
import { PostDetailScreen } from '../features/home/screens/PostDetailScreen';
import { SubscriptionScreen } from '../features/profile/screens/SubscriptionScreen';
import { SupportScreen } from '../features/profile/screens/SupportScreen';
import { SupportTicketDetailScreen } from '../features/profile/screens/SupportTicketDetailScreen';
import { useTheme } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="ChatDirectory" component={ChatDirectoryScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EventHub" component={EventHubScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventApplications" component={EventApplicationsScreen} />
      <Stack.Screen name="MyEventApplications" component={MyEventApplicationsScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="DemoUpload" component={DemoUploadScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="DemoDetail" component={DemoDetailScreen} />
      <Stack.Screen name="ExpertProfile" component={ExpertProfileScreen} />
      <Stack.Screen name="ExpertsList" component={ExpertsListScreen} />
      <Stack.Screen name="Network" component={NetworkScreen} />
      <Stack.Screen name="TeamRequestsList" component={TeamRequestsListScreen} />
      <Stack.Screen name="PeopleList" component={PeopleListScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Communities" component={CommunitiesScreen} />
      <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
      <Stack.Screen name="CreateHub" component={CreateHubScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="PostTeamRequest" component={PostTeamRequestScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BecomeExpert" component={BecomeExpertScreen} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="MyPosts" component={MyPostsScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      <Stack.Screen name="MyDemos" component={MyDemosScreen} />
      <Stack.Screen name="Connections" component={ConnectionsScreen} />
      <Stack.Screen name="TeamRequestApplicants" component={TeamRequestApplicantsScreen} />
      <Stack.Screen name="TeamRequestDetail" component={TeamRequestDetailScreen} />
      <Stack.Screen name="MyTeamRequests" component={MyTeamRequestsScreen} />
      <Stack.Screen name="RoomMembers" component={RoomMembersScreen} />
      <Stack.Screen name="RoomMedia" component={RoomMediaScreen} />
      <Stack.Screen name="RoomStarred" component={RoomStarredScreen} />
      <Stack.Screen name="RoomInvites" component={RoomInvitesScreen} />
      <Stack.Screen name="RoomJoinRequests" component={RoomJoinRequestsScreen} />
      <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ExpertAvailability" component={ExpertAvailabilityScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetailScreen} />
    </Stack.Navigator>
  );
}
