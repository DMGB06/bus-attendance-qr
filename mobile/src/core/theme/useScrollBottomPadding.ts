import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

/**
 * Altura reservada bajo pantallas con tab bar flotante (`position: "absolute"`).
 * Usar en el contenedor de la pantalla, no solo en el padding del scroll.
 */
export function useTabSceneBottomInset(): number {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  return useMemo(
    () => tokens.layout.tabBarBaseHeight + insets.bottom,
    [insets.bottom, tokens.layout.tabBarBaseHeight],
  );
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
