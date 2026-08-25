import { IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen as BrandSplash } from './src/features/auth/screens/SplashScreen';
import { useConnectivity } from './src/hooks/useOffline';
import { useAuthStore } from './src/store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useConnectivity();
  const [loaded, error] = useFonts({
    Outfit_700Bold,
    Outfit_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(id);
  }, []);

  const ready = loaded || !!error || timedOut;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return <BrandSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
