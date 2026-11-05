import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { waveBack, waveFront, waveMid } from '@/src/shared/ui/waveImages';

/**
 * La banda sobrepasa este alto lo que sigue, con una franja del color del fondo. Con zoom
 * fraccionario el borde de la banda y el de las imagenes caen entre dos pixeles y dejan ver
 * las olas de atras como una raya azul: el borde queda dentro del fondo, donde no se nota.
 */
const EDGE = 3;

/** 4 ondas de ~195 px: igual que se veia en un celular de 390 px. */
const CHUNK = 780;

const WAVES = [
  { source: waveBack, duration: 26000 },
  { source: waveMid, duration: 19000 },
  { source: waveFront, duration: 14000 },
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
  source: { uri: string };
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

  // Cada imagen mide CHUNK y trae 4 ondas: el largo de onda no depende de la ventana.
  // Al desplazar un CHUNK la forma coincide y el salto no se nota.
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -CHUNK] });
  const copies = Math.ceil((width + CHUNK) / CHUNK);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.wave, { width: copies * CHUNK, height, transform: [{ translateX }] }]}
    >
      {Array.from({ length: copies }, (_, i) => (
        <Image
          key={i}
          source={source}
          resizeMode="stretch"
          style={{ width: CHUNK, height, tintColor: color }}
        />
      ))}
    </Animated.View>
  );
}

export function WaveBand({ colors, height = 38, animated = false }: WaveBandProps) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  return (
    <View
      style={[styles.band, { height: height + EDGE, marginBottom: -EDGE }]}
      pointerEvents="none"
    >
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
      <View style={[styles.edge, { backgroundColor: colors[2] }]} />
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
    bottom: EDGE,
    flexDirection: 'row',
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: EDGE + 1,
  },
});
