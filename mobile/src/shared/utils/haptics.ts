import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

async function runHaptic(task: () => Promise<void>) {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await task();
  } catch {
    // Algunos dispositivos o emuladores no soportan haptics.
  }
}

/** Vibración breve al leer un QR válido y encontrar al alumno. */
export function notifyScanSuccess() {
  return runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}
