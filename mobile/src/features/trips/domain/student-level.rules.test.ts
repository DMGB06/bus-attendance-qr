import {
  getSuggestedNivelForTurn,
  matchesSuggestedLevelFilter,
} from "@/src/features/trips/domain/student-level.rules";

describe("student-level.rules", () => {
  it("sugiere el nivel segun el turno de la tarde", () => {
    expect(getSuggestedNivelForTurn("tarde_primaria")).toBe("primaria");
    expect(getSuggestedNivelForTurn("tarde_secundaria")).toBe("secundaria");
  });

  it("no sugiere nivel en otros turnos", () => {
    expect(getSuggestedNivelForTurn("mañana")).toBeNull();
    expect(getSuggestedNivelForTurn(null)).toBeNull();
  });

  it("el filtro no oculta a quien no tiene nivel registrado", () => {
    expect(matchesSuggestedLevelFilter({ nivel_educativo: null }, "primaria")).toBe(true);
  });

  it("el filtro separa los niveles", () => {
    expect(matchesSuggestedLevelFilter({ nivel_educativo: "primaria" }, "primaria")).toBe(true);
    expect(matchesSuggestedLevelFilter({ nivel_educativo: "secundaria" }, "primaria")).toBe(false);
  });
});
