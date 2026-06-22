import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/** true cuando la app está en pantalla (no en background). */
export function useAppForeground(): boolean {
  const [isForeground, setIsForeground] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      setIsForeground(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return isForeground;
}
