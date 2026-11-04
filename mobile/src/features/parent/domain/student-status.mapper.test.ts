import type { ChildTimelineEvent } from "@/src/features/parent/types";
import {
  mapChildStatusToPresentation,
  mapLatestTimelineEventToPresentation,
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

describe("mapStudentTripStatusToPresentation con el viaje cerrado", () => {
  it("no sigue diciendo que subio al bus", () => {
    const presentation = mapStudentTripStatusToPresentation("onboard", "recojo", { tripEnded: true });

    expect(presentation.label).toBe("Viaje finalizado");
    expect(presentation.tone).toBe("pending");
  });

  it("no cambia un estado ya terminado", () => {
    const presentation = mapStudentTripStatusToPresentation("at_school", "recojo", { tripEnded: true });

    expect(presentation.tone).toBe("completed");
  });

  it("con el viaje en curso mantiene el estado", () => {
    expect(mapStudentTripStatusToPresentation("onboard", "recojo").label).toBe("Subió al bus");
  });
});

describe("mapChildStatusToPresentation", () => {
  const boardedEvent = {
    id: "e1",
    event_type: "subio",
    scanned_at: "2026-06-21T12:00:00Z",
    direction: "recojo",
    turn_type: "mañana",
  } as unknown as ChildTimelineEvent;

  it("con el viaje cerrado no repite el ultimo evento de subida", () => {
    const presentation = mapChildStatusToPresentation({
      latestEvent: boardedEvent,
      status: "onboard",
      direction: "recojo",
      hasActiveTrip: false,
    });

    expect(presentation.label).toBe("Viaje finalizado");
  });

  it("con el viaje en curso muestra el ultimo evento", () => {
    const presentation = mapChildStatusToPresentation({
      latestEvent: boardedEvent,
      status: "onboard",
      direction: "recojo",
      hasActiveTrip: true,
    });

    expect(presentation).toEqual(mapLatestTimelineEventToPresentation(boardedEvent));
  });
});
