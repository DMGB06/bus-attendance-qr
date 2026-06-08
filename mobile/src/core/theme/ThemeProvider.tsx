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
import { Platform, type TextStyle } from 'react-native';

import { buildPaperTheme } from '@/src/core/theme/buildPaperTheme';
import {
  getSemanticColors,
  type ColorSchemeId,
  type SemanticColors,
} from '@/src/core/theme/semanticColors';
import {
  loadHighContrastEnabled,
  persistHighContrastEnabled,
} from '@/src/core/theme/highContrastStorage';
import { fontFamily, fontSize, layout, radius, spacing, typography } from '@/src/core/theme/tokens';
import { loadStoredColorScheme, persistColorScheme } from '@/src/core/theme/themeStorage';

type DesignTokens = {
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: Record<keyof typeof fontSize, number>;
  fontFamily: typeof fontFamily;
  layout: typeof layout;
  typography: Record<keyof typeof typography, TextStyle>;
};

export type AppThemeContextValue = {
  scheme: ColorSchemeId;
  setScheme: (next: ColorSchemeId) => void;
  toggleScheme: () => void;
  highContrastEnabled: boolean;
  setHighContrastEnabled: (enabled: boolean) => void;
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
  const [highContrastEnabled, setHighContrastState] = useState(false);
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedScheme, storedHighContrast] = await Promise.all([
        loadStoredColorScheme(),
        loadHighContrastEnabled(),
      ]);
      if (!cancelled && storedScheme) {
        setSchemeState(storedScheme);
      }
      if (!cancelled) {
        setHighContrastState(storedHighContrast);
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

  const setHighContrastEnabled = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    void persistHighContrastEnabled(enabled);
  }, []);

  const isDark = scheme === 'dark';
  const colors = useMemo(
    () => getSemanticColors(scheme, highContrastEnabled && !isDark),
    [scheme, highContrastEnabled, isDark],
  );
  const paperTheme = useMemo(() => buildPaperTheme(colors, isDark), [colors, isDark]);

  const activeTokens = useMemo<DesignTokens>(() => {
    if (!highContrastEnabled || isDark) {
      return defaultTokens;
    }

    return {
      ...defaultTokens,
      fontSize: {
        ...fontSize,
        sm: fontSize.sm + 1,
        md: fontSize.md + 1,
        lg: fontSize.lg + 1,
      },
      typography: {
        ...typography,
        body: { ...typography.body, fontSize: fontSize.md + 1, lineHeight: 24 },
        label: { ...typography.label, fontSize: fontSize.sm + 1, lineHeight: 20 },
        caption: { ...typography.caption, fontSize: fontSize.sm + 1, lineHeight: 18 },
      },
    };
  }, [highContrastEnabled, isDark]);

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
      highContrastEnabled,
      setHighContrastEnabled,
      colors,
      isDark,
      paperTheme,
      tokens: activeTokens,
      isThemeReady,
    }),
    [
      scheme,
      setScheme,
      toggleScheme,
      highContrastEnabled,
      setHighContrastEnabled,
      colors,
      isDark,
      paperTheme,
      activeTokens,
      isThemeReady,
    ],
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
