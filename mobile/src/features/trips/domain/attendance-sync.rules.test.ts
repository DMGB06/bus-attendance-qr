import {
  canUndoPendingRecord,
  isLocalPendingRecord,
  isQueueEntrySyncedOnServer,
  isRecordPendingSync,
} from "@/src/features/trips/domain/attendance-sync.rules";
import type { QueuedAttendanceWrite } from "@/src/features/trips/storage/attendance-queue.storage";
import type { AttendanceRecord } from "@/src/features/trips/types";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {},
}));

const record = (patch: Partial<AttendanceRecord> = {}) =>
  ({ id: "r1", trip_id: "t1", student_id: "s1", event_type: "subio", voided_at: null, ...patch }) as AttendanceRecord;
const entry = { tripId: "t1", studentId: "s1", eventType: "subio" } as QueuedAttendanceWrite;
const undo = { isPendingSync: true, pendingScannedBy: "u1", currentUserId: "u1", isDriver: false, isAssistant: false };

describe("attendance-sync.rules", () => {
  it("reconoce los registros que aun no llegan al servidor", () => {
    expect(isLocalPendingRecord(record({ id: "local-1" }))).toBe(true);
    expect(isLocalPendingRecord(record({ id: "patch-1" }))).toBe(true);
    expect(isLocalPendingRecord(record())).toBe(false);
  });

  it("un registro del servidor queda pendiente solo si sigue en la cola", () => {
    expect(isRecordPendingSync(record(), [entry])).toBe(true);
    expect(isRecordPendingSync(record(), [])).toBe(false);
    expect(isRecordPendingSync(null, [entry])).toBe(false);
  });

  it("un registro anulado no cuenta como ya sincronizado", () => {
    expect(isQueueEntrySyncedOnServer(entry, [record()])).toBe(true);
    expect(isQueueEntrySyncedOnServer(entry, [record({ voided_at: "2026-06-14" })])).toBe(false);
  });

  it("el chofer deshace cualquier pendiente", () => {
    expect(canUndoPendingRecord({ ...undo, pendingScannedBy: "otro", isDriver: true })).toBe(true);
  });

  it("la asistenta solo deshace lo suyo", () => {
    expect(canUndoPendingRecord({ ...undo, isAssistant: true })).toBe(true);
    expect(canUndoPendingRecord({ ...undo, pendingScannedBy: "otro", isAssistant: true })).toBe(false);
  });

  it("sin usuario no se puede deshacer", () => {
    expect(canUndoPendingRecord({ ...undo, currentUserId: null, isDriver: true })).toBe(false);
  });
});
