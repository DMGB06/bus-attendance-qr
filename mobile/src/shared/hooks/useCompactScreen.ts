import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const COMPACT_HEIGHT = 760;
const COMPACT_WIDTH = 390;

export function useCompactScreen() {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      isCompact: height < COMPACT_HEIGHT || width < COMPACT_WIDTH,
    }),
    [height, width],
  );
}
