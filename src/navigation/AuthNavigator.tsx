import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignupScreen } from '../features/auth/screens/SignupScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
