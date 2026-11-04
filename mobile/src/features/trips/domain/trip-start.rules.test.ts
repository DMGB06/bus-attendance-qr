import {
  getDefaultAfternoonTurn,
  getDefaultTripPeriod,
  getTurnStartSuggestion,
  isTurnCompletedToday,
} from "@/src/features/trips/domain/trip-start.rules";

describe("trip-start.rules", () => {
  it("detecta turno ya completado hoy", () => {
    expect(isTurnCompletedToday(["mañana"], "mañana")).toBe(true);
    expect(isTurnCompletedToday(["mañana"], "tarde_primaria")).toBe(false);
  });

  it("sugiere tarde si mañana ya cerró", () => {
    expect(getDefaultTripPeriod(["mañana"])).toBe("tarde");
    expect(getDefaultTripPeriod([], new Date("2026-03-10T13:00:00Z"))).toBe("mañana");
  });

  it("sugiere el siguiente tramo tarde disponible", () => {
    expect(getDefaultAfternoonTurn([])).toBe("tarde_primaria");
    expect(getDefaultAfternoonTurn(["tarde_primaria"])).toBe("tarde_secundaria");
    expect(getDefaultAfternoonTurn(["tarde_primaria", "tarde_secundaria"])).toBe("tarde_unica");
  });

  it("muestra sugerencia informativa sin bloquear", () => {
    expect(getTurnStartSuggestion(["mañana"], "mañana")).toMatch(/tarde/i);
    expect(getTurnStartSuggestion([], "tarde_primaria")).toMatch(/habitual/i);
  });
});

describe("getDefaultTripPeriod segun la hora de Lima", () => {
  const atLimaHour = (hour: number) =>
    new Date(`2026-06-21T${String(hour + 5).padStart(2, "0")}:00:00.000Z`);

  it("en la manana propone el recojo", () => {
    expect(getDefaultTripPeriod([], atLimaHour(7))).toBe("mañana");
  });

  it("en la tarde propone tarde aunque no se haya hecho el recojo", () => {
    expect(getDefaultTripPeriod([], atLimaHour(14))).toBe("tarde");
  });

  it("con el recojo hecho propone tarde a cualquier hora", () => {
    expect(getDefaultTripPeriod(["mañana"], atLimaHour(7))).toBe("tarde");
  });
});
