import '@/components/pwa-install-prompt';
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
import { RoleBlockedScreen } from '@/src/features/auth/components/RoleBlockedScreen';
import { getSession, logout } from '@/src/features/auth/services/auth.service';
import { clearLocalSessionData } from '@/src/features/auth/services/session-cleanup.service';
import { usePostLoginRoute } from '@/src/features/auth/hooks/usePostLoginRoute';
import { tripStoreActions } from '@/src/features/trips/store/tripStore';
import { AppThemeProvider } from '@/src/core/theme/ThemeProvider';
import { AppLoadingScreen } from '@/src/shared/ui/AppLoadingScreen';
import { BootSplashOverlay } from '@/src/shared/ui/BootSplashOverlay';
import { showLogoutError } from '@/src/shared/utils/confirmAlert';
import { perfMarkBootReady } from '@/src/shared/utils/perfMark';
import { withTimeout } from '@/src/shared/utils/withTimeout';
import { PushRegistrationSync } from '@/src/features/notifications/components/PushRegistrationSync';

void SplashScreen.preventAutoHideAsync();

const bootStartedAt = performance.now();
const BOOT_HYDRATE_TIMEOUT_MS = 6_000;

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      // Este efecto corre despues de 'load' en muchas cargas: escucharlo perderia el registro.
      navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
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
  const {
    ready: routeReady,
    href: postLoginHref,
    blockReason,
    retry: retryPostLoginRoute,
  } = usePostLoginRoute(session);

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
          // Con senal debil se entra igual; la hidratacion sigue y actualiza la pantalla.
          await withTimeout(tripStoreActions.hydrateActiveTrip(), BOOT_HYDRATE_TIMEOUT_MS, null);
        }

        setIsBootLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // INITIAL_SESSION llega null sin red con token vencido: el arranque ya lo resolvio arriba.
      if (!isMounted || event === 'INITIAL_SESSION') {
        return;
      }
      if (event === 'SIGNED_OUT') {
        void clearLocalSessionData().catch(() => undefined);
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
          {!isBootLoading && !session && !inAuthGroup ? <Redirect href={AUTH_ROUTES.login} /> : null}
          {session && postLoginHref && inAuthGroup ? <Redirect href={postLoginHref} /> : null}
          {roleRedirectHref ? <Redirect href={roleRedirectHref} /> : null}
          <PushRegistrationSync session={session} postLoginHref={postLoginHref} />
          <Stack screenOptions={fadeScreenOptions}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(ops)" />
            <Stack.Screen name="(parent)" />
          </Stack>
          {session && blockReason ? (
            <RoleBlockedScreen
              reason={blockReason}
              onRetry={retryPostLoginRoute}
              onLogout={() => void logout().catch(() => showLogoutError())}
            />
          ) : null}
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
