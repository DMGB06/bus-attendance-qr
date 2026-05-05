import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/src/lib/supabase';
import { getSession } from '@/src/services/auth';
import { useTripStore } from '@/src/stores/tripStore';
import { paperTheme } from '@/src/theme/theme';
import { AppLoadingScreen } from '@/src/components/AppLoadingScreen';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    void SplashScreen.hideAsync();
  }, []);

  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === '(auth)';
  const inAppGroup = rootSegment === '(app)';

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        {isBootLoading ? (
          <AppLoadingScreen />
        ) : !session && !inAuthGroup ? (
          <Redirect href="/(auth)/login" />
        ) : session && !inAppGroup ? (
          <Redirect href="/(app)" />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
