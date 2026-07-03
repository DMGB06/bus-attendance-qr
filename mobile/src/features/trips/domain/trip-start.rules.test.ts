import {
  getDefaultAfternoonTurn,
  getDefaultTripPeriod,
  getTurnStartSuggestion,
  isTurnCompletedToday,
  shouldBlockTurnStart,
} from "@/src/features/trips/domain/trip-start.rules";

describe("trip-start.rules", () => {
  it("detecta turno ya completado hoy", () => {
    expect(isTurnCompletedToday(["mañana"], "mañana")).toBe(true);
    expect(isTurnCompletedToday(["mañana"], "tarde_primaria")).toBe(false);
  });

  it("sugiere tarde si mañana ya cerró", () => {
    expect(getDefaultTripPeriod(["mañana"])).toBe("tarde");
    expect(getDefaultTripPeriod([])).toBe("mañana");
  });

  it("sugiere el siguiente tramo tarde disponible", () => {
    expect(getDefaultAfternoonTurn([])).toBe("tarde_primaria");
    expect(getDefaultAfternoonTurn(["tarde_primaria"])).toBe("tarde_secundaria");
    expect(getDefaultAfternoonTurn(["tarde_primaria", "tarde_secundaria"])).toBe("tarde_unica");
  });

  it("muestra sugerencia informativa sin bloquear", () => {
    expect(getTurnStartSuggestion(["mañana"], "mañana")).toMatch(/tarde/i);
    expect(getTurnStartSuggestion([], "tarde_primaria")).toMatch(/habitual/i);
    expect(shouldBlockTurnStart(["mañana"], "mañana")).toBe(false);
  });
});
