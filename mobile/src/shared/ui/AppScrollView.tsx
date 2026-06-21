import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

export type AppScrollViewProps = ScrollViewProps & {
  /** Padding inferior adicional (además del safe area y del hueco de la tab bar). */
  extraBottomInset?: number;
  /** Si es true, no reserva espacio bajo la tab bar (p. ej. pantallas de auth). */
  omitTabBarInset?: boolean;
  /** Expande el contenido para ocupar el alto disponible cuando el contenido es corto. */
  contentGrow?: boolean;
};

export function AppScrollView({
  contentContainerStyle,
  extraBottomInset = 0,
  omitTabBarInset = false,
  contentGrow = true,
  ...rest
}: AppScrollViewProps) {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useAppTheme();

  const contentStyle = useMemo(() => {
    const tabClearance = omitTabBarInset
      ? 0
      : tokens.layout.tabBarBaseHeight + tokens.spacing.lg;
    const paddingBottom = insets.bottom + tabClearance + extraBottomInset;
    const base: StyleProp<ViewStyle> = [
      contentGrow ? styles.grow : null,
      { paddingBottom },
      contentContainerStyle,
    ];
    return base;
  }, [contentContainerStyle, contentGrow, extraBottomInset, insets.bottom, omitTabBarInset, tokens.layout.tabBarBaseHeight, tokens.spacing.lg]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      indicatorStyle={isDark ? 'white' : 'black'}
      scrollEventThrottle={16}
      contentContainerStyle={contentStyle}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  grow: {
    flexGrow: 1,
  },
});
