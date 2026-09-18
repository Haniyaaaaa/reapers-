import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CyberCubicTabBar } from '../components/navigation/CyberCubicTabBar';
import { CommunitiesScreen } from '../features/communities/screens/CommunitiesScreen';
import { DemoFeedScreen } from '../features/demos/screens/DemoFeedScreen';
import { EventHubScreen } from '../features/events/screens/EventHubScreen';
import { ExpertDirectoryScreen } from '../features/experts/screens/ExpertDirectoryScreen';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={(props) => <CyberCubicTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="CommunitiesTab"
        component={CommunitiesScreen}
        options={{ title: 'Communities' }}
      />
      <Tab.Screen
        name="EventsTab"
        component={EventHubScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="DemosTab"
        component={DemoFeedScreen}
        options={{ title: 'Demos' }}
      />
      <Tab.Screen
        name="ExpertsTab"
        component={ExpertDirectoryScreen}
        options={{ title: 'Experts' }}
      />
    </Tab.Navigator>
  );
}
