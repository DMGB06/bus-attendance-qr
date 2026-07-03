import { Fragment, useCallback, useMemo, useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// 1. IMPORTAMOS PLATFORM DESDE REACT-NATIVE
import { Platform } from "react-native";

import { AUTH_ROUTES } from "@/src/core/routes";
import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { logout } from "@/src/features/auth/services/auth.service";
import { TripLocationPublisherSync } from "@/src/features/trips/components/TripLocationPublisherSync";
import { OpsTripHydrationSync } from "@/src/features/trips/components/OpsTripHydrationSync";
import { useActiveTripRoster } from "@/src/features/trips/hooks/useActiveTripRoster";
import { useAttendanceQueueSync } from "@/src/features/trips/hooks/useAttendanceQueueSync";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppTabHeaderBar } from "@/src/shared/ui/AppTabHeaderBar";

function ActiveTripRosterSync() {
  useActiveTripRoster();
  useAttendanceQueueSync();
  return null;
}

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const { capabilities, loading: capabilitiesLoading } = useAppCapabilities();

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace(AUTH_ROUTES.login);
  }, [router]);

  const renderHeader = useCallback(
    () => <AppTabHeaderBar onLogout={handleLogout} />,
    [handleLogout],
  );

  const tabLabelStyle = useMemo(
    () => ({
      ...tokens.typography.label,
      marginTop: 2,
    }),
    [tokens.typography.label],
  );

  const screenOptions = useMemo(
    () => ({
      sceneStyle: {
        backgroundColor: colors.screenSolid,
      },
      headerShadowVisible: false,
      header: renderHeader,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.tabBarActive,
      tabBarInactiveTintColor: colors.tabBarInactive,
      
      // 1. Dejamos el alto de la barra con un espacio extra en web, sin paddingBottom agresivo
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        height: Platform.OS === 'web' 
          ? tokens.layout.tabBarBaseHeight + 20 // 20px extra de altura en Web
          : tokens.layout.tabBarBaseHeight + insets.bottom,
        paddingTop: tokens.spacing.xs,
        paddingBottom: insets.bottom,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarLabelStyle: tabLabelStyle,
      
      // 2. EMPUJAMOS LOS ITEMS (ICONO + TEXTO) HACIA ARRIBA DESDE SU PROPIO ESTILO
      tabBarItemStyle: {
        paddingVertical: tokens.spacing.xs,
        marginBottom: Platform.OS === 'web' ? 12 : 0, // Esto eleva los iconos y nombres en la Web
      },
    }),
    [colors, insets.bottom, renderHeader, tabLabelStyle, tokens],
  );

  const showScannerTab = capabilitiesLoading || capabilities.canScan;
  const showRosterTab = capabilitiesLoading || capabilities.canViewRoster;

  return (
    <Fragment>
      <OpsTripHydrationSync />
      <ActiveTripRosterSync />
      <TripLocationPublisherSync />
      <Tabs initialRouteName="trip" screenOptions={screenOptions}>
        <Tabs.Screen
          name="trip"
          options={{
            title: capabilities.isAssistant ? "Viaje activo" : "Iniciar Viaje",
            tabBarLabel: "Viaje",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name="bus-clock"
                size={24}
                color={focused ? colors.tabBarActive : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            lazy: true,
            href: showScannerTab ? undefined : null,
            title: "Escanear QR",
            tabBarLabel: "Escanear",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "qrcode-scan" : "qrcode"}
                size={24}
                color={focused ? colors.tabBarActive : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="roster"
          options={{
            lazy: true,
            href: showRosterTab ? undefined : null,
            title: "Lista",
            tabBarLabel: "Lista",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "format-list-bulleted" : "format-list-bulleted-square"}
                size={24}
                color={focused ? colors.tabBarActive : color}
              />
            ),
          }}
        />
      <Tabs.Screen
        name="profile"
        options={{
          lazy: true,
          href: null,
          title: "Perfil",
        }}
      />
        <Tabs.Screen
          name="close-trip"
          options={{
            href: null,
            title: "Cerrar viaje",
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            href: null,
            title: "Historial",
          }}
        />
      </Tabs>
    </Fragment>
  );
}
