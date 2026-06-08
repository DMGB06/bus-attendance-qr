import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@buscontrol/high-contrast';

export async function loadHighContrastEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function persistHighContrastEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    /* non-fatal */
  }
}
