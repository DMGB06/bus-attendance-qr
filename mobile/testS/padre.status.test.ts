/**
 * Padre — prioridad de viajes y textos de estado.
 */
import type { StudentTripStatus } from "@/src/features/parent/types";
import {
  pickPreferredStudentTripStatusForParent,
} from "@/src/features/parent/domain/parent-linked-students";
import { mapStudentTripStatusToPresentation } from "@/src/features/parent/domain/student-status.mapper";

describe("testS · padre estado del hijo", () => {
  it("retorno tarde activo gana sobre recojo mañana completado", () => {
    const morning = {
      student_id: "s1",
      trip_id: "trip-morning",
      trip_date: "2026-06-21",
      direction: "recojo" as const,
      status: "at_school" as const,
      last_event_type: "bajo",
      last_event_at: "2026-06-21T12:49:00Z",
      updated_at: "2026-06-21T12:49:00Z",
    };
    const afternoon = {
      student_id: "s1",
      trip_id: "trip-afternoon",
      trip_date: "2026-06-21",
      direction: "retorno" as const,
      status: "returning" as const,
      last_event_type: "subio",
      last_event_at: "2026-06-21T14:37:00Z",
      updated_at: "2026-06-21T14:37:00Z",
    };
    const tripMap = new Map([
      ["trip-morning", { status: "completed", direction: "recojo" as const, trip_date: "2026-06-21", turn_type: "mañana" as const }],
      ["trip-afternoon", { status: "active", direction: "retorno" as const, trip_date: "2026-06-21", turn_type: "tarde_secundaria" as const }],
    ]);

    const picked = pickPreferredStudentTripStatusForParent(morning, afternoon, tripMap);
    expect(picked.status).toBe("returning");
    expect(mapStudentTripStatusToPresentation(picked.status, picked.direction).subtitle).toContain("Retorno");
  });

  it("viaje recojo duplicado activo no tapa llegó a casa", () => {
    const ghostMorning = {
      student_id: "s1",
      trip_id: "trip-ghost",
      trip_date: "2026-06-21",
      direction: "recojo" as const,
      status: "onboard" as const,
      last_event_type: "subio",
      last_event_at: "2026-06-21T21:32:00Z",
      updated_at: "2026-06-21T21:32:00Z",
    };
    const afternoonHome = {
      student_id: "s1",
      trip_id: "trip-afternoon",
      trip_date: "2026-06-21",
      direction: "retorno" as const,
      status: "dropped_off" as const,
      last_event_type: "bajo",
      last_event_at: "2026-06-21T20:49:00Z",
      updated_at: "2026-06-21T20:49:00Z",
    };
    const tripMap = new Map([
      ["trip-done", { status: "completed", direction: "recojo" as const, trip_date: "2026-06-21", turn_type: "mañana" as const }],
      ["trip-ghost", { status: "active", direction: "recojo" as const, trip_date: "2026-06-21", turn_type: "mañana" as const }],
      ["trip-afternoon", { status: "completed", direction: "retorno" as const, trip_date: "2026-06-21", turn_type: "tarde_secundaria" as const }],
    ]);

    let best: StudentTripStatus = afternoonHome;
    best = pickPreferredStudentTripStatusForParent(best, ghostMorning, tripMap);
    expect(best.status).toBe("dropped_off");
  });
});
