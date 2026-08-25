import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommunitiesScreen } from '../features/communities/screens/CommunitiesScreen';
import { CommunityDetailScreen } from '../features/communities/screens/CommunityDetailScreen';
import { ChatDetailScreen } from '../features/chat/screens/ChatDetailScreen';
import { CreateRoomScreen } from '../features/chat/screens/CreateRoomScreen';
import { CreateHubScreen } from '../features/create/screens/CreateHubScreen';
import { DemoDetailScreen } from '../features/demos/screens/DemoDetailScreen';
import { DemoUploadScreen } from '../features/demos/screens/DemoUploadScreen';
import { CreateEventScreen } from '../features/events/screens/CreateEventScreen';
import { EventDetailScreen } from '../features/events/screens/EventDetailScreen';
import { EventHubScreen } from '../features/events/screens/EventHubScreen';
import { BecomeExpertScreen } from '../features/experts/screens/BecomeExpertScreen';
import { ExpertProfileScreen } from '../features/experts/screens/ExpertProfileScreen';
import { VideoCallScreen } from '../features/experts/screens/VideoCallScreen';
import { NetworkScreen } from '../features/network/screens/NetworkScreen';
import { PostTeamRequestScreen } from '../features/network/screens/PostTeamRequestScreen';
import { NotificationsScreen } from '../features/profile/screens/NotificationsScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { SettingsScreen } from '../features/profile/screens/SettingsScreen';
import { useTheme } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EventHub" component={EventHubScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="DemoUpload" component={DemoUploadScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="DemoDetail" component={DemoDetailScreen} />
      <Stack.Screen name="ExpertProfile" component={ExpertProfileScreen} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      <Stack.Screen name="Network" component={NetworkScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Communities" component={CommunitiesScreen} />
      <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
      <Stack.Screen name="CreateHub" component={CreateHubScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="PostTeamRequest" component={PostTeamRequestScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BecomeExpert" component={BecomeExpertScreen} />
    </Stack.Navigator>
  );
}
