import {
  mapStudentTripStatusToPresentation,
  mapTimelineEventLabel,
} from "@/src/features/parent/domain/student-status.mapper";

describe("mapStudentTripStatusToPresentation", () => {
  it("muestra esperando recojo cuando no hay estado", () => {
    const result = mapStudentTripStatusToPresentation(null, "recojo");

    expect(result.label).toBe("Esperando recojo");
    expect(result.tone).toBe("pending");
  });

  it("muestra subió al bus en recojo", () => {
    const result = mapStudentTripStatusToPresentation("onboard", "recojo");

    expect(result.label).toBe("Subió al bus");
    expect(result.tone).toBe("onboard");
  });

  it("muestra llegó al colegio", () => {
    const result = mapStudentTripStatusToPresentation("at_school", "recojo");

    expect(result.label).toBe("Llegó al colegio");
    expect(result.tone).toBe("completed");
  });

  it("muestra llegó a casa en retorno", () => {
    const result = mapStudentTripStatusToPresentation("dropped_off", "retorno");

    expect(result.label).toBe("Llegó a casa");
    expect(result.tone).toBe("completed");
  });
});

describe("mapTimelineEventLabel", () => {
  it("etiqueta subida en recojo mañana", () => {
    expect(mapTimelineEventLabel("subio", "recojo", "mañana")).toBe(
      "Subió al bus (Recojo mañana)",
    );
  });

  it("etiqueta bajada en retorno", () => {
    expect(mapTimelineEventLabel("bajo", "retorno", null)).toBe("Llegó a casa");
  });
});
