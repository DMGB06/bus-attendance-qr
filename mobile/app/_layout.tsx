import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '@/src/core/config/supabase';
import { GUEST_CYCLE_KEY, useBootSplash } from '@/src/core/boot/useBootSplash';
import { fadeScreenOptions } from '@/src/core/navigation/screenTransitions';
import { AUTH_ROUTES } from '@/src/core/routes';
import { getSession } from '@/src/features/auth/services/auth.service';
import { usePostLoginRoute } from '@/src/features/auth/hooks/usePostLoginRoute';
import { tripStoreActions } from '@/src/features/trips/store/tripStore';
import { AppThemeProvider } from '@/src/core/theme/ThemeProvider';
import { AppLoadingScreen } from '@/src/shared/ui/AppLoadingScreen';
import { BootSplashOverlay } from '@/src/shared/ui/BootSplashOverlay';
import { perfMarkBootReady } from '@/src/shared/utils/perfMark';
import { PushRegistrationSync } from '@/src/features/notifications/components/PushRegistrationSync';

void SplashScreen.preventAutoHideAsync();

const bootStartedAt = performance.now();

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('Service Worker registrado con éxito:', reg))
          .catch(err => console.log('Error al registrar el Service Worker:', err));
      });
    }
  }, []);
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const skipNextSessionHydrateRef = useRef(false);
  const guestSplashDoneRef = useRef(false);
  const splashHiddenRef = useRef(false);
  const { ready: routeReady, href: postLoginHref } = usePostLoginRoute(session);

  const fontsReady = fontsLoaded || Boolean(fontsError);
  const waitingForRoute = Boolean(session) && !routeReady && !postLoginHref;
  const bootWorkReady = fontsReady && !isBootLoading && !waitingForRoute;
  const splashCycleKey = session?.user?.id ?? GUEST_CYCLE_KEY;
  const splashActive = !guestSplashDoneRef.current || Boolean(session);

  const handleSplashHidden = useCallback(() => {
    if (!session) {
      guestSplashDoneRef.current = true;
    }
  }, [session]);

  const { visible: splashVisible, opacity: splashOpacity } = useBootSplash({
    cycleKey: splashCycleKey,
    workReady: bootWorkReady,
    active: splashActive,
    onHidden: handleSplashHidden,
  });

  useEffect(() => {
    let isMounted = true;

    void getSession()
      .catch(() => null)
      .then(async (activeSession) => {
        if (!isMounted) {
          return;
        }

        setSession(activeSession ?? null);

        if (!activeSession) {
          tripStoreActions.clearActiveTrip();
        } else {
          skipNextSessionHydrateRef.current = true;
          await tripStoreActions.hydrateActiveTrip().catch(() => null);
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
  }, []);

  useEffect(() => {
    if (isBootLoading) {
      return;
    }

    if (!session) {
      tripStoreActions.clearActiveTrip();
      return;
    }

    if (skipNextSessionHydrateRef.current) {
      skipNextSessionHydrateRef.current = false;
      return;
    }

    void tripStoreActions.hydrateActiveTrip().catch(() => {
      tripStoreActions.clearActiveTrip();
    });
  }, [session, isBootLoading]);

  useEffect(() => {
    if (!fontsReady || splashHiddenRef.current) {
      return;
    }

    splashHiddenRef.current = true;
    void SplashScreen.hideAsync();
  }, [fontsReady]);

  useEffect(() => {
    if (bootWorkReady && !splashVisible) {
      perfMarkBootReady(bootStartedAt);
    }
  }, [bootWorkReady, splashVisible]);

  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === '(auth)';
  const inOpsGroup = rootSegment === '(ops)';
  const inParentGroup = rootSegment === '(parent)';

  if (!fontsReady) {
    return (
      <SafeAreaProvider>
        <AppThemeProvider>
          <AppLoadingScreen />
        </AppThemeProvider>
      </SafeAreaProvider>
    );
  }

  const roleRedirectHref =
    session && postLoginHref && !inAuthGroup
      ? (() => {
          const wantsParent = postLoginHref.startsWith('/(parent)');
          const wantsOps = postLoginHref.startsWith('/(ops)');

          if (wantsParent && inOpsGroup) {
            return postLoginHref;
          }

          if (wantsOps && inParentGroup) {
            return postLoginHref;
          }

          return null;
        })()
      : null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <View style={styles.root}>
          {!session && !inAuthGroup ? <Redirect href={AUTH_ROUTES.login} /> : null}
          {session && postLoginHref && inAuthGroup ? <Redirect href={postLoginHref} /> : null}
          {roleRedirectHref ? <Redirect href={roleRedirectHref} /> : null}
          <PushRegistrationSync session={session} postLoginHref={postLoginHref} />
          <Stack screenOptions={fadeScreenOptions}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(ops)" />
            <Stack.Screen name="(parent)" />
          </Stack>
          <BootSplashOverlay visible={splashVisible} opacity={splashOpacity} />
        </View>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
