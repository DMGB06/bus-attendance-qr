import type { TextStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Espaciado global y chrome de navegación (tab bar flotante). */
export const layout = {
  /** Altura visual útil de la barra de pestañas (sin safe area). */
  tabBarBaseHeight: 56,
  /** Padding inferior extra en scroll para no quedar tapado por tabs + margen. */
  scrollBottomInset: 80,
  /** Altura mínima táctil recomendada (WCAG). */
  minTouchTarget: 44,
  /** Control de apariencia en navbar */
  appearanceNavbarWidth: 58,
  appearanceNavbarHeight: 36,
  /** Altura estándar de botones principales */
  buttonHeight: 56,
  /** Altura mínima de bloques vacíos / placeholders */
  emptyStateMinHeight: 120,
  /** Tamaños de iconos en contenedores circulares */
  iconSm: 38,
  iconMd: 46,
  iconLg: 72,
  /** Iconos decorativos en estados vacíos */
  iconEmptyState: 54,
  /** Avatar de perfil */
  avatarProfileSize: 120,
  /** Marco de cámara del escáner */
  cameraMinHeight: 220,
  cameraMaxHeight: 360,
  cameraHeightRatio: 0.34,
} as const;

/**
 * Escala tipográfica única: títulos, cuerpo, labels.
 * Usar con `color` desde el tema semántico.
 */
export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: 40,
    letterSpacing: -0.6,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  title1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: 34,
    letterSpacing: -0.35,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  title2: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xl'],
    lineHeight: 30,
    letterSpacing: -0.2,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  title3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: 26,
    letterSpacing: -0.1,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  headline: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyStrong: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: 18,
    letterSpacing: 0.15,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: 18,
    letterSpacing: 0.35,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  overline: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: 14,
    letterSpacing: 1.1,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
} as const satisfies Record<string, TextStyle>;

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
