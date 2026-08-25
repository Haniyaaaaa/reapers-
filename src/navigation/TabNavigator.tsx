import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components/navigation/FloatingTabBar';
import { ChatDirectoryScreen } from '../features/chat/screens/ChatDirectoryScreen';
import { DemoFeedScreen } from '../features/demos/screens/DemoFeedScreen';
import { ExpertDirectoryScreen } from '../features/experts/screens/ExpertDirectoryScreen';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ChatTab" component={ChatDirectoryScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="DemosTab" component={DemoFeedScreen} options={{ title: 'Demos' }} />
      <Tab.Screen name="ExpertsTab" component={ExpertDirectoryScreen} options={{ title: 'Experts' }} />
    </Tab.Navigator>
  );
}
