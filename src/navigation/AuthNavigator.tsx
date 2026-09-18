import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { ResetPasswordScreen } from '../features/auth/screens/ResetPasswordScreen';
import { SetNewPasswordScreen } from '../features/auth/screens/SetNewPasswordScreen';
import { SignupScreen } from '../features/auth/screens/SignupScreen';
import { VerifyEmailScreen } from '../features/auth/screens/VerifyEmailScreen';
import { WelcomeScreen } from '../features/auth/screens/WelcomeScreen';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  // Reopening the app mid-recovery (code verified, new password not yet saved — a real
  // session already exists at that point) lands the user back on ResetPassword instead of
  // Welcome. gestureEnabled/headerBackVisible are off on that screen so it can't be swiped
  // away while a recovery session is live.
  const { passwordRecovery } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={passwordRecovery ? 'SetNewPassword' : 'Welcome'}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
