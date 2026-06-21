import {
  mapActivityEventLabelShort,
  mapActivityEventTagLabel,
} from "@/src/features/trips/domain/activity-event.labels";

describe("mapActivityEventLabelShort", () => {
  it("no repite el turno en subida", () => {
    expect(mapActivityEventLabelShort("subio", "recojo")).toBe("Subió al bus");
    expect(mapActivityEventLabelShort("subio", "retorno")).toBe("Subió al bus");
  });

  it("distingue bajada recojo vs retorno", () => {
    expect(mapActivityEventLabelShort("bajo", "recojo")).toBe("Llegó al colegio");
    expect(mapActivityEventLabelShort("bajo", "retorno")).toBe("Llegó a casa");
  });
});

describe("mapActivityEventTagLabel", () => {
  it("usa etiquetas compactas para el tag", () => {
    expect(mapActivityEventTagLabel("subio", "recojo")).toBe("Subió");
    expect(mapActivityEventTagLabel("bajo", "retorno")).toBe("Casa");
    expect(mapActivityEventTagLabel("ausente", "recojo")).toBe("Ausente");
  });
});
