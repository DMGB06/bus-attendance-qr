import {
  getCloseTripFailureMessage,
  loadCloseTripValidation,
} from "@/src/features/trips/services/close-trip-validation.service";
import { getTripAttendanceOnly, getTripRoster } from "@/src/features/trips/services/trip-roster.service";
import { loadCachedRosterSnapshot } from "@/src/features/trips/storage/roster-cache.storage";
import { getRosterSnapshot } from "@/src/features/trips/store/rosterStore";
import type { Trip } from "@/src/features/trips/types";

jest.mock("@/src/features/trips/services/close-trip.service", () => ({
  CLOSE_TRIP_CONNECTIVITY_WARNING: "aviso",
  resolvePendingDropoffStudents: jest.fn(async () => ({ students: [], networkTimedOut: false })),
}));
jest.mock("@/src/features/trips/services/trip-day-context.service", () => ({
  getMorningAttendanceHints: jest.fn(async () => new Set<string>()),
}));
jest.mock("@/src/features/trips/services/trip-roster.service", () => ({
  getTripRoster: jest.fn(),
  getTripAttendanceOnly: jest.fn(),
}));
jest.mock("@/src/features/trips/storage/roster-cache.storage", () => ({
  loadCachedRosterSnapshot: jest.fn(),
}));
jest.mock("@/src/features/trips/store/rosterStore", () => ({
  getRosterSnapshot: jest.fn(),
}));

const trip = { id: "t1", direction: "recojo", trip_date: "2026-06-14" } as Trip;
const rosterItem = { student: { id: "s1", nombre_alumno: "Ana" }, status: "pending" };

const snapshot = getRosterSnapshot as jest.Mock;
const cached = loadCachedRosterSnapshot as jest.Mock;
const server = getTripRoster as jest.Mock;
const attendance = getTripAttendanceOnly as jest.Mock;

describe("loadCloseTripValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    attendance.mockResolvedValue([]);
    snapshot.mockReturnValue({ tripId: null, items: [], isShowingCache: false });
    cached.mockResolvedValue(null);
  });

  it("avisa cuando la lista viene de la cache del dispositivo", async () => {
    cached.mockResolvedValue({ items: [rosterItem] });

    const result = await loadCloseTripValidation(trip);

    expect(result.connectivityWarning).toBe("aviso");
  });

  it("avisa cuando la lista en memoria se cargo desde la cache", async () => {
    snapshot.mockReturnValue({ tripId: "t1", items: [rosterItem], isShowingCache: true });

    const result = await loadCloseTripValidation(trip);

    expect(result.connectivityWarning).toBe("aviso");
  });

  it("avisa aunque quien llama pase la lista cargada desde la cache", async () => {
    snapshot.mockReturnValue({ tripId: "t1", items: [rosterItem], isShowingCache: true });

    const result = await loadCloseTripValidation(trip, { rosterItems: [rosterItem] as never });

    expect(result.connectivityWarning).toBe("aviso");
  });

  it("no avisa si la lista en memoria viene del servidor", async () => {
    snapshot.mockReturnValue({ tripId: "t1", items: [rosterItem], isShowingCache: false });

    const result = await loadCloseTripValidation(trip);

    expect(result.connectivityWarning).toBeNull();
  });

  it("avisa si la lista en memoria vino del servidor pero la red ya no responde", async () => {
    snapshot.mockReturnValue({ tripId: "t1", items: [rosterItem], isShowingCache: false });
    attendance.mockRejectedValue(new Error("sin red"));

    const result = await loadCloseTripValidation(trip);

    expect(result.connectivityWarning).toBe("aviso");
  });

  it("avisa si quien llama pasa la lista en memoria y la red ya no responde", async () => {
    snapshot.mockReturnValue({ tripId: "t1", items: [rosterItem], isShowingCache: false });
    attendance.mockRejectedValue(new Error("sin red"));

    const result = await loadCloseTripValidation(trip, { rosterItems: [rosterItem] as never });

    expect(result.connectivityWarning).toBe("aviso");
  });

  it("no avisa si la consulta al servidor responde", async () => {
    server.mockResolvedValue([rosterItem]);

    const result = await loadCloseTripValidation(trip);

    expect(result.connectivityWarning).toBeNull();
  });
});

describe("getCloseTripFailureMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sin servidor explica que el viaje sigue abierto, no el error interno", async () => {
    attendance.mockRejectedValue(new Error("sin red"));

    const message = await getCloseTripFailureMessage(
      "t1",
      new Error("No se pudo consultar la asignación de bus."),
    );

    expect(message).toContain("viaje sigue abierto");
    expect(message).not.toContain("asignación");
  });

  it("con servidor conserva el motivo real del rechazo", async () => {
    attendance.mockResolvedValue([]);

    const message = await getCloseTripFailureMessage(
      "t1",
      new Error("Solo el chofer puede cerrar el viaje."),
    );

    expect(message).toBe("Solo el chofer puede cerrar el viaje.");
  });
});
