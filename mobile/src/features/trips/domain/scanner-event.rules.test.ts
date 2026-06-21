import { resolveScannerEvent } from "@/src/features/trips/domain/scanner-event.rules";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { Student } from "@/src/features/trips/types";

const student = { id: "student-1" } as Student;

function rosterItem(status: TripRosterItem["status"]): TripRosterItem {
  return {
    student,
    status,
    attendance: null,
    hasAttendance: false,
    canMarkManual: status === "pending",
    canMarkExit: status === "onboard",
    isPendingSync: false,
    pendingScannedBy: null,
  };
}

describe("resolveScannerEvent", () => {
  it("permite subida si el alumno está pendiente", () => {
    const result = resolveScannerEvent("recojo", rosterItem("pending"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intent).toBe("boarding");
      expect(result.eventType).toBe("subio");
    }
  });

  it("bloquea si el alumno ya está a bordo", () => {
    const result = resolveScannerEvent("retorno", rosterItem("onboard"));

    expect(result).toEqual({
      ok: false,
      error:
        "Este alumno ya está a bordo. Registra la bajada desde la lista cuando llegue al destino.",
    });
  });

  it("bloquea si el alumno ya completó la bajada", () => {
    const result = resolveScannerEvent("recojo", rosterItem("completed"));

    expect(result).toEqual({
      ok: false,
      error: "Este alumno ya fue registrado en colegio.",
    });
  });
});
