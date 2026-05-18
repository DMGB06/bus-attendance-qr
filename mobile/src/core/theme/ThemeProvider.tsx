import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PaperProvider, type MD3Theme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Platform } from 'react-native';

import { buildPaperTheme } from '@/src/core/theme/buildPaperTheme';
import {
  getSemanticColors,
  type ColorSchemeId,
  type SemanticColors,
} from '@/src/core/theme/semanticColors';
import { fontFamily, fontSize, layout, radius, spacing, typography } from '@/src/core/theme/tokens';
import { loadStoredColorScheme, persistColorScheme } from '@/src/core/theme/themeStorage';

type DesignTokens = {
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontFamily: typeof fontFamily;
  layout: typeof layout;
  typography: typeof typography;
};

export type AppThemeContextValue = {
  scheme: ColorSchemeId;
  setScheme: (next: ColorSchemeId) => void;
  toggleScheme: () => void;
  colors: SemanticColors;
  isDark: boolean;
  paperTheme: MD3Theme;
  tokens: DesignTokens;
  isThemeReady: boolean;
};

const ThemeContext = createContext<AppThemeContextValue | null>(null);

const defaultTokens: DesignTokens = {
  spacing,
  radius,
  fontSize,
  fontFamily,
  layout,
  typography,
};

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [scheme, setSchemeState] = useState<ColorSchemeId>('light');
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadStoredColorScheme();
      if (!cancelled && stored) {
        setSchemeState(stored);
      }
      if (!cancelled) {
        setIsThemeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setScheme = useCallback((next: ColorSchemeId) => {
    setSchemeState(next);
    void persistColorScheme(next);
  }, []);

  const toggleScheme = useCallback(() => {
    setSchemeState((prev) => {
      const next: ColorSchemeId = prev === 'light' ? 'dark' : 'light';
      void persistColorScheme(next);
      return next;
    });
  }, []);

  const isDark = scheme === 'dark';
  const colors = useMemo(() => getSemanticColors(scheme), [scheme]);
  const paperTheme = useMemo(() => buildPaperTheme(colors, isDark), [colors, isDark]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.screenSolid);
  }, [colors.screenSolid]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    root.style.setProperty('--app-scrollbar-track', colors.surfaceTrack);
    root.style.setProperty('--app-scrollbar-thumb', colors.borderDefault);
    root.style.setProperty('--app-scrollbar-thumb-hover', colors.primarySoftText);
  }, [colors.surfaceTrack, colors.borderDefault, colors.primarySoftText]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      scheme,
      setScheme,
      toggleScheme,
      colors,
      isDark,
      paperTheme,
      tokens: defaultTokens,
      isThemeReady,
    }),
    [scheme, setScheme, toggleScheme, colors, isDark, paperTheme, isThemeReady],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
