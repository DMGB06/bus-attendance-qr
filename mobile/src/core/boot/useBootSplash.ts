import { useCallback, useEffect, useRef, useState } from 'react';
import { runOnJS, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import {
  BOOT_SPLASH_FADE_MS,
  MIN_BOOT_SPLASH_MS,
  MIN_POST_AUTH_SPLASH_MS,
} from '@/src/core/boot/constants';

const GUEST_CYCLE_KEY = 'guest';

type UseBootSplashParams = {
  cycleKey: string;
  workReady: boolean;
  active: boolean;
  onHidden?: () => void;
};

type UseBootSplashResult = {
  visible: boolean;
  opacity: SharedValue<number>;
};

function getMinDisplayMs(cycleKey: string) {
  return cycleKey === GUEST_CYCLE_KEY ? MIN_BOOT_SPLASH_MS : MIN_POST_AUTH_SPLASH_MS;
}

export function useBootSplash({
  cycleKey,
  workReady,
  active,
  onHidden,
}: UseBootSplashParams): UseBootSplashResult {
  const [visible, setVisible] = useState(active);
  const opacity = useSharedValue(1);
  const cycleStartedAtRef = useRef(performance.now());
  const activeCycleRef = useRef(cycleKey);
  const fadeScheduledRef = useRef(false);
  const onHiddenRef = useRef(onHidden);

  onHiddenRef.current = onHidden;

  const finishHide = useCallback(() => {
    fadeScheduledRef.current = false;
    setVisible(false);
    onHiddenRef.current?.();
  }, []);

  const showCycle = useCallback(
    (nextCycleKey: string) => {
      activeCycleRef.current = nextCycleKey;
      cycleStartedAtRef.current = performance.now();
      fadeScheduledRef.current = false;
      opacity.value = 1;
      setVisible(true);
    },
    [opacity],
  );

  useEffect(() => {
    if (!active) {
      fadeScheduledRef.current = false;
      opacity.value = 0;
      setVisible(false);
      return;
    }

    if (activeCycleRef.current !== cycleKey) {
      showCycle(cycleKey);
    }
  }, [active, cycleKey, opacity, showCycle]);

  useEffect(() => {
    if (!active || !visible || !workReady || fadeScheduledRef.current) {
      return;
    }

    fadeScheduledRef.current = true;

    const elapsed = performance.now() - cycleStartedAtRef.current;
    const delay = Math.max(0, getMinDisplayMs(activeCycleRef.current) - elapsed);

    const timerId = setTimeout(() => {
      opacity.value = withTiming(0, { duration: BOOT_SPLASH_FADE_MS }, (finished) => {
        if (finished) {
          runOnJS(finishHide)();
        }
      });
    }, delay);

    return () => {
      clearTimeout(timerId);
      if (!workReady) {
        fadeScheduledRef.current = false;
      }
    };
  }, [active, visible, workReady, opacity, finishHide]);

  return {
    visible: active && visible,
    opacity,
  };
}

export { GUEST_CYCLE_KEY };
