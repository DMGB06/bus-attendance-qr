import { useCallback } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "expo-router";

import {
  isPerfMarksEnabled,
  perfMarkScreenFocus,
  perfMarkScreenReady,
} from "@/src/shared/utils/perfMark";

/** Registra en Metro cuánto tarda una pantalla en estar lista tras el foco (solo con `EXPO_PUBLIC_PERF_MARKS=true`). */
export function useScreenPerfMark(screenName: string) {
  useFocusEffect(
    useCallback(() => {
      if (!isPerfMarksEnabled()) {
        return;
      }

      const focusStartedAt = performance.now();
      perfMarkScreenFocus(screenName);

      const task = InteractionManager.runAfterInteractions(() => {
        perfMarkScreenReady(screenName, focusStartedAt);
      });

      return () => {
        task.cancel();
      };
    }, [screenName]),
  );
}
