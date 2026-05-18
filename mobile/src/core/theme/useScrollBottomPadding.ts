import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

/**
 * Padding inferior recomendado para listas/scroll cuando hay tab bar flotante.
 */
export function useScrollBottomPadding(extra = 0, omitTabBarInset = false): number {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  return useMemo(() => {
    const tab = omitTabBarInset ? 0 : tokens.layout.scrollBottomInset;
    return insets.bottom + tab + extra;
  }, [extra, insets.bottom, omitTabBarInset, tokens.layout.scrollBottomInset]);
}
