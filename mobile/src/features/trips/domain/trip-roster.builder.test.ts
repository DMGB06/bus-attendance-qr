import { deriveRosterStatus } from "@/src/features/trips/domain/trip-roster.builder";
import type { AttendanceRecord } from "@/src/features/trips/types";

function record(
  eventType: AttendanceRecord["event_type"],
  scannedAt: string,
  voidedAt: string | null = null,
): AttendanceRecord {
  return {
    id: `id-${eventType}-${scannedAt}`,
    trip_id: "trip-1",
    student_id: "student-1",
    event_type: eventType,
    scanned_at: scannedAt,
    lat: null,
    lng: null,
    operator_id: null,
    is_offline_sync: false,
    scanned_by: null,
    scan_role: null,
    voided_at: voidedAt,
    voided_by: null,
    void_reason: null,
  };
}

describe("deriveRosterStatus", () => {
  it("pendiente sin historial", () => {
    expect(deriveRosterStatus([])).toBe("pending");
  });

  it("a bordo tras subio", () => {
    expect(deriveRosterStatus([record("subio", "2026-06-21T10:00:00Z")])).toBe("onboard");
  });

  it("completado tras subio y bajo", () => {
    expect(
      deriveRosterStatus([
        record("subio", "2026-06-21T10:00:00Z"),
        record("bajo", "2026-06-21T10:10:00Z"),
      ]),
    ).toBe("completed");
  });

  it("vuelve a bordo si hay un segundo subio", () => {
    expect(
      deriveRosterStatus([
        record("subio", "2026-06-21T10:00:00Z"),
        record("bajo", "2026-06-21T10:10:00Z"),
        record("subio", "2026-06-21T16:30:00Z"),
      ]),
    ).toBe("onboard");
  });

  it("ignora un bajo antiguo si el alumno volvió a subir", () => {
    expect(
      deriveRosterStatus([
        record("subio", "2026-06-21T10:00:00Z"),
        record("bajo", "2026-06-21T10:10:00Z"),
        record("subio", "2026-06-21T16:30:00Z"),
        record("bajo", "2026-06-21T16:35:00Z"),
      ]),
    ).toBe("completed");
  });

  it("vuelve a bordo si se anula solo el último bajo", () => {
    expect(
      deriveRosterStatus([
        record("subio", "2026-06-21T10:00:00Z"),
        record("bajo", "2026-06-21T10:10:00Z"),
        record("subio", "2026-06-21T16:30:00Z"),
        record("bajo", "2026-06-21T16:35:00Z", "2026-06-21T17:00:00Z"),
      ]),
    ).toBe("onboard");
  });
});
