import { Platform } from 'react-native';

/** Opciones compartidas para transiciones suaves entre pantallas. */
export const fadeScreenOptions = {
  headerShown: false,
  animation: 'fade' as const,
  animationDuration: Platform.OS === 'web' ? 220 : 280,
  contentStyle: { flex: 1 },
};
