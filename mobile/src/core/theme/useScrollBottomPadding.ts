import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

const WEB_TAB_BAR_EXTRA_HEIGHT = 20;

/** Altura real de la barra de pestanas: en web no hay zona segura y lleva un espacio extra. */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  return (
    tokens.layout.tabBarBaseHeight +
    (Platform.OS === 'web' ? WEB_TAB_BAR_EXTRA_HEIGHT : insets.bottom)
  );
}

/**
 * Altura reservada bajo pantallas con tab bar flotante (`position: "absolute"`).
 * Usar en el contenedor de la pantalla, no solo en el padding del scroll.
 */
export function useTabSceneBottomInset(): number {
  return useTabBarHeight();
}

/**
 * Padding inferior recomendado para listas/scroll cuando hay tab bar flotante.
 */
export function useScrollBottomPadding(extra = 0, omitTabBarInset = false): number {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  return useMemo(() => {
    const tab = omitTabBarInset ? 0 : tokens.layout.tabBarBaseHeight + tokens.spacing.lg;
    return insets.bottom + tab + extra;
  }, [extra, insets.bottom, omitTabBarInset, tokens.layout.tabBarBaseHeight, tokens.spacing.lg]);
}
