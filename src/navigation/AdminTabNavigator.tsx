import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdminTabBar } from '../components/navigation/AdminTabBar';
import { AdminOverviewScreen } from '../features/admin/screens/AdminOverviewScreen';
import { AdminApprovalsScreen } from '../features/admin/screens/AdminApprovalsScreen';
import { AdminUsersScreen } from '../features/admin/screens/AdminUsersScreen';
import { AdminSubscriptionsScreen } from '../features/admin/screens/AdminSubscriptionsScreen';
import { AdminSupportTicketsScreen } from '../features/admin/screens/AdminSupportTicketsScreen';
import type { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <AdminTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="AdminOverview" component={AdminOverviewScreen} />
      <Tab.Screen name="AdminApprovals" component={AdminApprovalsScreen} />
      <Tab.Screen name="AdminUsersTab" component={AdminUsersScreen} />
      <Tab.Screen name="AdminBilling" component={AdminSubscriptionsScreen} />
      <Tab.Screen name="AdminSupportTab" component={AdminSupportTicketsScreen} />
    </Tab.Navigator>
  );
}
