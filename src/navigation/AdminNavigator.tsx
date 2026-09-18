import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminUserDetailScreen } from '../features/admin/screens/AdminUserDetailScreen';
import { AdminTicketDetailScreen } from '../features/admin/screens/AdminTicketDetailScreen';
import { ManualOnboardExpertScreen } from '../features/admin/screens/ManualOnboardExpertScreen';
import { AdminTabNavigator } from './AdminTabNavigator';
import { useTheme } from '../theme';
import type { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

// The admin console — a dedicated bottom-tab shell (AdminTabNavigator), not a screen buried
// inside the member app. Registered as a sibling of `Main` in RootNavigator so an admin can
// step into the normal app ("View as member") and back without losing this stack.
export function AdminNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
      <Stack.Screen name="AdminTicketDetail" component={AdminTicketDetailScreen} />
      <Stack.Screen name="ManualOnboardExpert" component={ManualOnboardExpertScreen} />
    </Stack.Navigator>
  );
}
