import type { TextStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

/** Radios más contenidos — interfaz operativa, no decorativa. */
export const radius = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  full: 9999,
} as const;

/** Escala legible en campo (bus, sol directo). */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 22,
  '3xl': 26,
  '4xl': 30,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Espaciado global y chrome de navegación (tab bar flotante). */
export const layout = {
  tabBarBaseHeight: 58,
  scrollBottomInset: 82,
  minTouchTarget: 48,
  appearanceNavbarWidth: 58,
  appearanceNavbarHeight: 40,
  buttonHeight: 56,
  /** Ancho del área lateral del header para centrar el título */
  headerSideWidth: 96,
  emptyStateMinHeight: 120,
  iconSm: 36,
  iconMd: 42,
  iconLg: 64,
  iconEmptyState: 48,
  avatarProfileSize: 108,
  cameraMinHeight: 220,
  cameraMaxHeight: 360,
  cameraHeightRatio: 0.38,
} as const;

/**
 * Escala tipográfica compacta. Usar con `color` desde el tema semántico.
 */
export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: 36,
    letterSpacing: -0.2,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  title1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: 32,
    letterSpacing: -0.15,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  title2: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xl'],
    lineHeight: 26,
    letterSpacing: -0.1,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  title3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  headline: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyStrong: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: 16,
    letterSpacing: 0.25,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  overline: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: 13,
    letterSpacing: 0.8,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
} as const satisfies Record<string, TextStyle>;

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
