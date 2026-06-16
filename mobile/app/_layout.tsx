import { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '@/src/core/config/supabase';
import { AUTH_ROUTES } from '@/src/core/routes';
import { getSession } from '@/src/features/auth/services/auth.service';
import { usePostLoginRoute } from '@/src/features/auth/hooks/usePostLoginRoute';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { AppThemeProvider } from '@/src/core/theme/ThemeProvider';
import { AppLoadingScreen } from '@/src/shared/ui/AppLoadingScreen';
import { perfMarkBootReady } from '@/src/shared/utils/perfMark';
import { PushRegistrationSync } from '@/src/features/notifications/components/PushRegistrationSync';

void SplashScreen.preventAutoHideAsync();

const bootStartedAt = performance.now();

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
  const skipNextSessionHydrateRef = useRef(false);
  const { ready: routeReady, href: postLoginHref } = usePostLoginRoute(session);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      getSession().catch(() => null),
      hydrateActiveTrip().catch(() => null),
    ]).then(([activeSession]) => {
      if (!isMounted) {
        return;
      }

      setSession(activeSession ?? null);
      if (!activeSession) {
        clearActiveTrip();
      } else {
        skipNextSessionHydrateRef.current = true;
      }
      setIsBootLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateActiveTrip, clearActiveTrip]);

  useEffect(() => {
    if (isBootLoading) {
      return;
    }

    if (!session) {
      clearActiveTrip();
      return;
    }

    if (skipNextSessionHydrateRef.current) {
      skipNextSessionHydrateRef.current = false;
      return;
    }

    void hydrateActiveTrip().catch(() => {
      clearActiveTrip();
    });
  }, [session, isBootLoading, hydrateActiveTrip, clearActiveTrip]);

  useEffect(() => {
    if (fontsLoaded && !isBootLoading) {
      perfMarkBootReady(bootStartedAt);
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isBootLoading]);

  if (fontsError) {
    return <AppLoadingScreen />;
  }

  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === '(auth)';
  const inOpsGroup = rootSegment === '(ops)';
  const inParentGroup = rootSegment === '(parent)';
  const waitingForRoute = Boolean(session) && !routeReady && !postLoginHref;
  const showBootLoader = !fontsLoaded || isBootLoading || waitingForRoute;

  if (showBootLoader) {
    return (
      <SafeAreaProvider>
        <AppThemeProvider>
          <AppLoadingScreen />
        </AppThemeProvider>
      </SafeAreaProvider>
    );
  }

  if (!session && !inAuthGroup) {
    return <Redirect href={AUTH_ROUTES.login} />;
  }

  if (session && postLoginHref && inAuthGroup) {
    return (
      <SafeAreaProvider>
        <AppThemeProvider>
          <Redirect href={postLoginHref} />
        </AppThemeProvider>
      </SafeAreaProvider>
    );
  }

  if (session && postLoginHref && !inAuthGroup) {
    const wantsParent = postLoginHref.startsWith('/(parent)');
    const wantsOps = postLoginHref.startsWith('/(ops)');

    if (wantsParent && inOpsGroup) {
      return <Redirect href={postLoginHref} />;
    }

    if (wantsOps && inParentGroup) {
      return <Redirect href={postLoginHref} />;
    }
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <PushRegistrationSync session={session} postLoginHref={postLoginHref} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(ops)" />
          <Stack.Screen name="(parent)" />
        </Stack>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
