/**
 * Chofer — cola offline, lista, anular y volver a marcar en colegio.
 */
import {
  isLocalPendingRecord,
  isQueueEntrySyncedOnServer,
  isRecordPendingSync,
  canVoidSyncedRecord,
} from "@/src/features/trips/domain/attendance-sync.rules";
import { canRegisterDropoff } from "@/src/features/trips/domain/attendance.rules";
import { deriveRosterStatus } from "@/src/features/trips/domain/trip-roster.builder";
import type { TripRosterItem } from "@/src/features/trips/types/trip-roster";
import type { AttendanceRecord, Student } from "@/src/features/trips/types";
import type { QueuedAttendanceWrite } from "@/src/features/trips/storage/attendance-queue.storage";

const student = { id: "stu-1" } as Student;

function record(
  id: string,
  eventType: AttendanceRecord["event_type"],
  scannedAt: string,
  voidedAt: string | null = null,
): AttendanceRecord {
  return {
    id,
    trip_id: "trip-1",
    student_id: student.id,
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

function rosterItem(status: TripRosterItem["status"], attendance: AttendanceRecord | null): TripRosterItem {
  return {
    student,
    status,
    attendance,
    hasAttendance: Boolean(attendance),
    canMarkManual: status === "pending",
    canMarkExit: status === "onboard",
    isPendingSync: false,
    pendingScannedBy: null,
  };
}

describe("testS · chofer sync y roster", () => {
  it("registro del servidor no muestra Pendiente sync por is_offline_sync", () => {
    const server = record("real-id", "bajo", "2026-06-21T17:00:00Z");
    server.is_offline_sync = true;

    expect(isLocalPendingRecord(server)).toBe(false);
    expect(isRecordPendingSync(server, [])).toBe(false);
  });

  it("patch/local sí cuenta como pendiente de sync", () => {
    const patch = record("patch-123", "bajo", "2026-06-21T17:00:00Z");
    expect(isRecordPendingSync(patch, [])).toBe(true);
  });

  it("cola obsoleta marca pendiente si el servidor ya tiene el evento (hasta prune)", () => {
    const server = record("real-bajo", "bajo", "2026-06-21T17:00:00Z");
    const queue: QueuedAttendanceWrite[] = [
      {
        id: "q1",
        tripId: "trip-1",
        studentId: student.id,
        eventType: "bajo",
        createdAt: "2026-06-21T16:59:00Z",
      },
    ];

    expect(isQueueEntrySyncedOnServer(queue[0], [server])).toBe(true);
    expect(isRecordPendingSync(server, queue)).toBe(true);
  });

  it("tras anular último bajo vuelve a onboard y permite marcar en colegio", () => {
    const history = [
      record("r1", "subio", "2026-06-21T10:00:00Z"),
      record("r2", "bajo", "2026-06-21T10:10:00Z"),
      record("r3", "subio", "2026-06-21T16:30:00Z"),
      record("r4", "bajo", "2026-06-21T16:35:00Z", "2026-06-21T17:00:00Z"),
    ];

    expect(deriveRosterStatus(history)).toBe("onboard");
    expect(canRegisterDropoff(rosterItem("onboard", history[2]))).toBe(true);
  });

  it("Anular registro visible solo con id real y sin pending sync", () => {
    const real = record("uuid-real", "bajo", "2026-06-21T17:00:00Z");
    expect(
      canVoidSyncedRecord({
        record: real,
        isPendingSync: false,
        canVoid: true,
      }),
    ).toBe(true);

    const patch = record("patch-1", "bajo", "2026-06-21T17:00:00Z");
    expect(
      canVoidSyncedRecord({
        record: patch,
        isPendingSync: false,
        canVoid: true,
      }),
    ).toBe(false);
  });
});
