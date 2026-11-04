import * as Location from "expo-location";

import { ensureForegroundLocationPermission } from "@/src/features/trips/services/location-permissions.service";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const current = Location.getForegroundPermissionsAsync as jest.Mock;
const request = Location.requestForegroundPermissionsAsync as jest.Mock;

describe("ensureForegroundLocationPermission", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no vuelve a pedir el permiso si el sistema ya no deja preguntar", async () => {
    current.mockResolvedValue({ granted: false, canAskAgain: false });

    await expect(ensureForegroundLocationPermission()).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it("pide el permiso si todavia se puede preguntar", async () => {
    current.mockResolvedValue({ granted: false, canAskAgain: true });

    await ensureForegroundLocationPermission();

    expect(request).toHaveBeenCalledTimes(1);
  });
});
