import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '@/src/core/config/supabase';
import { getSession } from '@/src/features/auth/services/auth.service';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { AppThemeProvider } from '@/src/core/theme/ThemeProvider';
import { AppLoadingScreen } from '@/src/shared/ui/AppLoadingScreen';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const segments = useSegments();
  const { hydrateActiveTrip, clearActiveTrip } = useTripStore();
  const [session, setSession] = useState<Session | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const minLoaderPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });

    const sessionPromise = getSession()
      .then((activeSession) => {
        if (!isMounted) {
          return;
        }
        setSession(activeSession ?? null);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setSession(null);
      });

    void Promise.all([sessionPromise, minLoaderPromise]).finally(() => {
      if (!isMounted) {
        return;
      }
      setIsBootLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!session) {
      clearActiveTrip();
      return () => {
        isMounted = false;
      };
    }

    void hydrateActiveTrip().catch(() => {
      if (!isMounted) {
        return;
      }
      clearActiveTrip();
    });

    return () => {
      isMounted = false;
    };
  }, [session, hydrateActiveTrip, clearActiveTrip]);

  useEffect(() => {
    if (fontsLoaded && !isBootLoading) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isBootLoading]);

  if (fontsError) {
    return <AppLoadingScreen />;
  }

  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === '(auth)';
  const inTabsGroup = rootSegment === '(tabs)';

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        {!fontsLoaded || isBootLoading ? (
          <AppLoadingScreen />
        ) : !session && !inAuthGroup ? (
          <Redirect href="/(auth)/login" />
        ) : session && !inTabsGroup ? (
          <Redirect href="/(tabs)/trip" />
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        )}
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
