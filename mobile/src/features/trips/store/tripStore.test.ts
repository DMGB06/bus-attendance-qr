import AsyncStorage from "@react-native-async-storage/async-storage";

import { resolveOperatorTripSnapshot } from "@/src/features/trips/services/trips.service";
import { tripStoreActions } from "@/src/features/trips/store/tripStore";
import type { Trip } from "@/src/features/trips/types";
import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
      clear: async () => store.clear(),
    },
  };
});
jest.mock("@/src/features/trips/services/trips.service", () => ({
  resolveOperatorTripSnapshot: jest.fn(),
}));

const snapshot = resolveOperatorTripSnapshot as jest.Mock;
const trip = (id: string, tripDate = getLocalTodayDateIso()) =>
  ({ id, status: "active", trip_date: tripDate }) as Trip;
const context = { busId: "b1", busCode: "BUS-01", busLabel: "Bus", crewRole: "chofer", appRole: null };

describe("tripStore", () => {
  beforeEach(async () => {
    await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
    tripStoreActions.clearActiveTrip();
    jest.clearAllMocks();
  });

  it("un fallo de red conserva el viaje activo", async () => {
    snapshot.mockResolvedValueOnce({ context, activeTrip: trip("t1") });
    await tripStoreActions.hydrateActiveTrip();

    snapshot.mockRejectedValueOnce(new Error("Network request failed"));
    await expect(tripStoreActions.hydrateActiveTrip()).resolves.toMatchObject({ id: "t1" });

    expect(tripStoreActions.getActiveTripId()).toBe("t1");
    expect(tripStoreActions.getOperationalContext()).toEqual(context);
  });

  it("arranque sin red recupera el viaje guardado de hoy", async () => {
    snapshot.mockResolvedValueOnce({ context, activeTrip: trip("t1") });
    await tripStoreActions.hydrateActiveTrip();
    tripStoreActions.forgetActiveTripInMemory();

    snapshot.mockRejectedValueOnce(new Error("Network request failed"));
    await tripStoreActions.hydrateActiveTrip();

    expect(tripStoreActions.getActiveTripId()).toBe("t1");
    expect(tripStoreActions.getOperationalContext()).toEqual(context);
  });

  it("ignora un viaje guardado de otro dia", async () => {
    snapshot.mockResolvedValueOnce({ context, activeTrip: trip("t1", "2020-01-01") });
    await tripStoreActions.hydrateActiveTrip();
    tripStoreActions.forgetActiveTripInMemory();

    snapshot.mockRejectedValueOnce(new Error("Network request failed"));
    await tripStoreActions.hydrateActiveTrip();

    expect(tripStoreActions.getActiveTripId()).toBeNull();
  });

  it("el servidor sin viaje activo si limpia el viaje guardado", async () => {
    snapshot.mockResolvedValueOnce({ context, activeTrip: trip("t1") });
    await tripStoreActions.hydrateActiveTrip();
    snapshot.mockResolvedValueOnce({ context, activeTrip: null });
    await tripStoreActions.hydrateActiveTrip();
    tripStoreActions.forgetActiveTripInMemory();

    snapshot.mockRejectedValueOnce(new Error("Network request failed"));
    await tripStoreActions.hydrateActiveTrip();

    expect(tripStoreActions.getActiveTripId()).toBeNull();
  });

  it("con la red colgada recupera el viaje guardado sin esperar minutos", async () => {
    snapshot.mockResolvedValueOnce({ context, activeTrip: trip("t1") });
    await tripStoreActions.hydrateActiveTrip();
    tripStoreActions.forgetActiveTripInMemory();

    jest.useFakeTimers();
    snapshot.mockReturnValueOnce(new Promise(() => undefined));
    const pending = tripStoreActions.hydrateActiveTrip();
    await jest.advanceTimersByTimeAsync(5_000);
    await pending;
    jest.useRealTimers();

    expect(tripStoreActions.getActiveTripId()).toBe("t1");
  });

  it("una hidratacion en vuelo no pisa el viaje recien iniciado", async () => {
    let finish: (value: unknown) => void = () => undefined;
    snapshot.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const pending = tripStoreActions.hydrateActiveTrip();
    tripStoreActions.setActiveTrip(trip("nuevo"));
    finish({ context, activeTrip: null });
    await pending;

    expect(tripStoreActions.getActiveTripId()).toBe("nuevo");
  });

  it("una hidratacion en vuelo no revive un viaje recien cerrado", async () => {
    snapshot.mockResolvedValueOnce({ context, activeTrip: trip("t1") });
    await tripStoreActions.hydrateActiveTrip();

    let finish: (value: unknown) => void = () => undefined;
    snapshot.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const pending = tripStoreActions.hydrateActiveTrip();
    tripStoreActions.releaseActiveTripAfterClose();
    finish({ context, activeTrip: trip("t1") });
    await pending;

    expect(tripStoreActions.getActiveTripId()).toBeNull();
  });
});
