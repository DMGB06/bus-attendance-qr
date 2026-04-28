import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import { Redirect, Stack, useSegments } from 'expo-router';

import { supabase } from '@/src/lib/supabase';
import { getSession } from '@/src/services/auth';
import { useTripStore } from '@/src/stores/tripStore';
import { paperTheme } from '@/src/theme/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const segments = useSegments();
  const { hydrateActiveTrip, clearActiveTrip } = useTripStore();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void getSession()
      .then((activeSession) => {
        if (!isMounted) {
          return;
        }
        setSession(activeSession ?? null);
        setIsLoadingSession(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setSession(null);
        setIsLoadingSession(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingSession) {
      void SplashScreen.hideAsync();
    }
  }, [isLoadingSession]);

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

  if (isLoadingSession) {
    return null;
  }

  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === '(auth)';
  const inAppGroup = rootSegment === '(app)';

  if (!session && !inAuthGroup) {
    return (
      <PaperProvider theme={paperTheme}>
        <Redirect href="/(auth)/login" />
      </PaperProvider>
    );
  }

  if (session && !inAppGroup) {
    return (
      <PaperProvider theme={paperTheme}>
        <Redirect href="/(app)" />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </PaperProvider>
  );
}
