import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearLocalSessionData } from "@/src/features/auth/services/session-cleanup.service";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getAllKeys: async () => [...store.keys()],
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value);
      },
      multiRemove: async (keys: string[]) => {
        keys.forEach((key) => store.delete(key));
      },
    },
  };
});

const mockClearRoster = jest.fn();
const mockClearTrip = jest.fn();
const mockClearParent = jest.fn();
const mockClearGuardians = jest.fn();
const mockClearHints = jest.fn();
const mockClearProfile = jest.fn(async () => undefined);

jest.mock("@/src/features/trips/store/rosterStore", () => ({
  rosterStoreActions: { clearRosterStore: () => mockClearRoster() },
}));
jest.mock("@/src/features/trips/store/tripStore", () => ({
  tripStoreActions: { clearActiveTrip: () => mockClearTrip() },
}));
jest.mock("@/src/features/parent/store/parentChildrenStore", () => ({
  parentChildrenStore: { clearParentChildrenStore: () => mockClearParent() },
}));
jest.mock("@/src/features/trips/services/students.service", () => ({
  clearGuardianCatalogCache: () => mockClearGuardians(),
}));
jest.mock("@/src/features/trips/services/trip-day-context.service", () => ({
  clearMorningHintsCache: () => mockClearHints(),
}));
jest.mock("@/src/features/profile/storage/profile-cache.storage", () => ({
  clearCachedProfile: () => mockClearProfile(),
}));

describe("clearLocalSessionData", () => {
  it("borra datos de la cuenta y conserva cola y preferencias del dispositivo", async () => {
    const keys = [
      "@buscontrol/roster/students",
      "@buscontrol/roster/attendance/trip-1",
      "@buscontrol/roster/snapshot/trip-2",
      "@buscontrol/profile-cache:a@b.c",
      "@buscontrol/active-trip-snapshot",
    ];
    const kept = [
      "@buscontrol/attendance-queue",
      "@buscontrol/attendance-queue:corrupt",
      "@buscontrol/color-scheme",
      "@buscontrol/high-contrast",
      "otra-app/clave",
    ];
    await Promise.all([...keys, ...kept].map((key) => AsyncStorage.setItem(key, "x")));

    await clearLocalSessionData();

    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual([...kept].sort());
    expect(mockClearRoster).toHaveBeenCalled();
    expect(mockClearTrip).toHaveBeenCalled();
    expect(mockClearParent).toHaveBeenCalled();
    expect(mockClearGuardians).toHaveBeenCalled();
    expect(mockClearHints).toHaveBeenCalled();
    expect(mockClearProfile).toHaveBeenCalled();
  });
});
