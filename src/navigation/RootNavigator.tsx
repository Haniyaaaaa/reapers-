import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SplashScreen as SplashView } from '../features/auth/screens/SplashScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { PendingApprovalScreen } from '../features/onboarding/screens/PendingApprovalScreen';
import { ProfilePreviewSheet } from '../components/profile/ProfilePreviewSheet';
import { AppTour } from '../features/tour/AppTour';
import { useAuth } from '../hooks/useAuth';
import { joinPresence, subscribeOnlineUsers } from '../services/supabase/presence';
import { subscribeToConnectionChanges } from '../services/supabase/network';
import { usePresenceStore } from '../store/presenceStore';
import { useNetworkStore } from '../store/networkStore';
import { useTheme } from '../theme';
import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { linking } from './linking';
import { MainNavigator } from './MainNavigator';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { hydrated, isSignedIn, onboarded, user, passwordRecovery } = useAuth();
  const { colors, light } = useTheme();
  // Admin approval only gates Game Developers and Experts — Gamer-only accounts go straight in.
  const isGamerOnly = !!user && user.roles.length > 0 && user.roles.every((r) => r === 'gamer');
  // True while the person can be in the member app — the tour must never appear over auth,
  // onboarding or the pending-approval screen. Admins skip onboarding/approval entirely and can step
  // into the member app ("View as member"), so they qualify too; they just don't get the tour
  // auto-started (see `autoStart` below) — they can still run it from Settings > App tour > Replay.
  const inMemberApp =
    isSignedIn &&
    !passwordRecovery &&
    !!user &&
    (user.isAdmin || (onboarded && user.approvalStatus !== 'rejected' && !(user.approvalStatus === 'pending' && !isGamerOnly)));
  const setOnlineUserIds = usePresenceStore((s) => s.setOnlineUserIds);
  const fetchPeople = useNetworkStore((s) => s.fetchPeople);
  const fetchConnections = useNetworkStore((s) => s.fetchConnections);

  const userId = user?.id;
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    const leavePresence = joinPresence(userId);
    const unsubscribe = subscribeOnlineUsers(setOnlineUserIds);
    return () => {
      unsubscribe();
      leavePresence();
    };
  }, [isSignedIn, userId, setOnlineUserIds]);

  // Real-time replacement for the old "only catches up on next screen focus" pattern — any
  // connection request sent/accepted/declined touching this user (from either side, possibly
  // on another device) now updates the app immediately instead of needing a manual refresh.
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    const unsubscribe = subscribeToConnectionChanges(userId, () => {
      fetchPeople(userId);
      fetchConnections(userId);
    });
    return unsubscribe;
  }, [isSignedIn, userId, fetchPeople, fetchConnections]);

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
    <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
      <StatusBar style={light ? 'dark' : 'light'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isSignedIn || passwordRecovery ? (
          // The passwordRecovery half of this condition keeps a user on the Auth stack even
          // though verifyPasswordReset already produced a real session — otherwise they'd be
          // dropped straight into the app (or Onboarding) mid-reset, before choosing a new
          // password. See authStore's passwordRecovery field for the full reasoning.
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.isAdmin ? (
          // Admins skip the gamer/developer/expert role wizard and the approval wait
          // entirely — they're already vouched for by definition (profiles.is_admin can
          // only ever be set via a trusted DB session, never through the app itself).
          // Both AdminConsole and Main are registered (not just one) so an admin can step
          // into the normal member app ("View as member" in AdminOverviewScreen) and back
          // (the matching row in SettingsScreen) without this outer branch re-evaluating.
          <>
            <Stack.Screen name="AdminConsole" component={AdminNavigator} />
            <Stack.Screen name="Main" component={MainNavigator} />
          </>
        ) : !onboarded || user?.approvalStatus === 'rejected' ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : user?.approvalStatus === 'pending' && !isGamerOnly ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
      <ProfilePreviewSheet />
      <AppTour enabled={inMemberApp} autoStart={!user?.isAdmin} user={user} />
    </NavigationContainer>
  );
}
