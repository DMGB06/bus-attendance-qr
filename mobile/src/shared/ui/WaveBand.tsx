import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const WAVES = [
  { source: require('../../../assets/images/wave-back.png'), duration: 26000 },
  { source: require('../../../assets/images/wave-mid.png'), duration: 19000 },
  { source: require('../../../assets/images/wave-front.png'), duration: 14000 },
] as const;

type WaveBandProps = {
  /** Colores de atras hacia adelante. El ultimo debe ser el del fondo que sigue. */
  colors: readonly [string, string, string];
  height?: number;
  animated?: boolean;
};

function Wave({
  source,
  color,
  width,
  height,
  duration,
  animated,
}: {
  source: number;
  color: string;
  width: number;
  height: number;
  duration: number;
  animated: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, duration, progress]);

  // La imagen mide dos pantallas y repite su forma: al llegar a -width el salto no se nota.
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });

  return (
    <Animated.Image
      source={source}
      resizeMode="stretch"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.wave,
        { width: width * 2, height, tintColor: color, transform: [{ translateX }] },
      ]}
    />
  );
}

export function WaveBand({ colors, height = 38, animated = false }: WaveBandProps) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  return (
    <View style={[styles.band, { height }]} pointerEvents="none">
      {WAVES.map((wave, index) => (
        <Wave
          key={index}
          source={wave.source}
          color={colors[index]}
          width={width}
          height={height}
          duration={wave.duration}
          animated={animated && !reducedMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    overflow: 'hidden',
    width: '100%',
  },
  wave: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
});
