import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { SupportedStorage } from "@supabase/supabase-js";

const ssrNoopStorage: SupportedStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

const webStorage: SupportedStorage = {
  getItem: (key) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key, value) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

/**
 * Storage de sesión Supabase compatible con:
 * - Android/iOS (AsyncStorage)
 * - Web en navegador (localStorage)
 * - SSR de Expo Router en Node (no-op; evita `window is not defined`)
 */
export const supabaseAuthStorage: SupportedStorage =
  typeof window === "undefined"
    ? ssrNoopStorage
    : Platform.OS === "web"
      ? webStorage
      : AsyncStorage;
