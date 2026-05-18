import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ColorSchemeId } from '@/src/core/theme/semanticColors';

const STORAGE_KEY = '@buscontrol/color-scheme';

function isColorSchemeId(value: unknown): value is ColorSchemeId {
  return value === 'light' || value === 'dark';
}

export async function loadStoredColorScheme(): Promise<ColorSchemeId | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isColorSchemeId(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function persistColorScheme(scheme: ColorSchemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
  } catch {
    /* non-fatal: theme still applies in-memory */
  }
}
