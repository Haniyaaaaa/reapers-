import { ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/feedback/ErrorBoundary';
import { SplashScreen as BrandSplash } from './src/features/auth/screens/SplashScreen';
import { useConnectivity } from './src/hooks/useOffline';
import { useAuthStore } from './src/store/authStore';
import { initAnalytics } from './src/services/analytics/analytics';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
initAnalytics();

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useConnectivity();
  const [loaded, error] = useFonts({
    ChakraPetch_700Bold,
    ChakraPetch_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const splashFade = useRef(new Animated.Value(1)).current;

  // Dismiss native splash immediately so our custom animated BrandSplash is visible
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(id);
  }, []);

  const ready = ((loaded || !!error) && animationDone) || timedOut;

  // When animation finishes and fonts are ready, smoothly fade out the splash screen
  useEffect(() => {
    if (ready) {
      Animated.timing(splashFade, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setSplashVisible(false);
      });
    }
  }, [ready, splashFade]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>

      {splashVisible && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: splashFade, zIndex: 99999 },
          ]}
          pointerEvents={ready ? 'none' : 'auto'}
        >
          <BrandSplash onAnimationEnd={() => setAnimationDone(true)} />
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}
