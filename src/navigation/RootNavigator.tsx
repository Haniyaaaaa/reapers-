import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen as SplashView } from '../features/auth/screens/SplashScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { linking } from './linking';
import { MainNavigator } from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { hydrated, isSignedIn, onboarded } = useAuth();
  const { colors, light } = useTheme();

  if (!hydrated) return <SplashView />;

  const navTheme = {
    ...(light ? DefaultTheme : DarkTheme),
    colors: {
      ...(light ? DefaultTheme.colors : DarkTheme.colors),
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.magenta,
    },
  };

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <StatusBar style={light ? 'dark' : 'light'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isSignedIn ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
