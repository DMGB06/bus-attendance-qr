import { MD3DarkTheme } from "react-native-paper";

// Theme tokens
export const colors = {
  background: "#131418",
  surface: "#2d3449",
  surfaceLight: "#3d4a6b",
  border: "#3d4a6b",

  textPrimary: "#ffffff",
  textMuted: "#9ca3af",
  textLabel: "#e5e7eb",

  primary: "#4A90E2",
  success: "#4ade80",
  error: "#EF4444",

  // Auth screen semantic tokens
  authBackground: "#0f141d",
  authGlow: "rgba(14, 165, 255, 0.1)",
  authInputBackground: "rgba(18, 24, 33, 0.88)",
  authInputBorder: "#36404f",
  authInputBorderActive: "#1a73ff",
  authInputPlaceholder: "#6f7986",
  authTextPrimary: "#f8fafc",
  authTextSecondary: "#dbe4f0",
  authTextMuted: "#697080",
  authCta: "#1677ff",
  authCtaText: "#e7f5ff",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 13,
  lg: 15,
  xl: 22,
} as const;

// ── Paper Theme ───────────────────────────────────
export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.textLabel,
    outline: colors.border,
    error: colors.error,
  },
  roundness: 12,
};

// ── Font Family ───────────────────────────────────
export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
