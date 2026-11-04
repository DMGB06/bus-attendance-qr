import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_KEY_PREFIX = "@buscontrol/";

/**
 * Se conservan: la cola (asistencias aun sin subir, que solo sube la misma cuenta)
 * y las preferencias del dispositivo.
 */
const KEPT_KEY_PREFIXES = [
  "@buscontrol/attendance-queue",
  "@buscontrol/color-scheme",
  "@buscontrol/high-contrast",
];

/** Limpia los datos de la cuenta al cerrar sesion, voluntaria o no. */
export async function clearLocalSessionData(): Promise<void> {
  const { tripStoreActions } = await import("@/src/features/trips/store/tripStore");
  const { parentChildrenStore } = await import("@/src/features/parent/store/parentChildrenStore");
  const { rosterStoreActions } = await import("@/src/features/trips/store/rosterStore");
  const { clearGuardianCatalogCache } = await import("@/src/features/trips/services/students.service");
  const { clearMorningHintsCache } = await import(
    "@/src/features/trips/services/trip-day-context.service"
  );
  const { clearCachedProfile } = await import("@/src/features/profile/storage/profile-cache.storage");

  rosterStoreActions.clearRosterStore();
  tripStoreActions.clearActiveTrip();
  parentChildrenStore.clearParentChildrenStore();
  clearGuardianCatalogCache();
  clearMorningHintsCache();
  await clearCachedProfile();

  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter(
      (key) =>
        key.startsWith(APP_KEY_PREFIX) &&
        !KEPT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)),
    ),
  );
}
