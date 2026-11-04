import { mergeAttendanceRecords } from "@/src/features/trips/services/trip-roster-merge.service";
import type { QueuedAttendanceWrite } from "@/src/features/trips/storage/attendance-queue.storage";
import type { AttendanceRecord } from "@/src/features/trips/types";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {},
}));

const queued: QueuedAttendanceWrite = {
  id: "q1",
  tripId: "trip-1",
  studentId: "stu-1",
  eventType: "subio",
  createdAt: "2026-06-21T12:00:00.000Z",
};

describe("mergeAttendanceRecords", () => {
  it("usa la hora en que se encolo, no la hora actual", () => {
    const [record] = mergeAttendanceRecords([], [queued]);

    expect(record.scanned_at).toBe(queued.createdAt);
  });

  it("muestra la entrada encolada aunque exista una anulada del mismo tipo", () => {
    const voided = {
      id: "server-1",
      trip_id: "trip-1",
      student_id: "stu-1",
      event_type: "subio",
      scanned_at: "2026-06-21T11:00:00.000Z",
      voided_at: "2026-06-21T11:30:00.000Z",
    } as AttendanceRecord;

    const merged = mergeAttendanceRecords([voided], [queued]);

    expect(merged.map((record) => record.id)).toEqual(["server-1", "local-q1"]);
  });
});
