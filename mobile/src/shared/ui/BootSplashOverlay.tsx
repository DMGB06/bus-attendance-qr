import { StyleSheet } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { AppLoadingScreen } from '@/src/shared/ui/AppLoadingScreen';

type BootSplashOverlayProps = {
  visible: boolean;
  opacity: SharedValue<number>;
};

export function BootSplashOverlay({ visible, opacity }: BootSplashOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      pointerEvents="auto"
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando CerroBus"
    >
      <AppLoadingScreen />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
