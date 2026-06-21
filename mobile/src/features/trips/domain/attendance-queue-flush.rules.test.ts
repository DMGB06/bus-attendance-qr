import { shouldFlushAttendanceQueueBeforeRefresh } from "@/src/features/trips/domain/attendance-queue-flush.rules";

describe("shouldFlushAttendanceQueueBeforeRefresh", () => {
  it("no hace flush si skipQueueFlush es true", () => {
    expect(shouldFlushAttendanceQueueBeforeRefresh(5, true)).toBe(false);
  });

  it("no hace flush sin pendientes", () => {
    expect(shouldFlushAttendanceQueueBeforeRefresh(0)).toBe(false);
  });

  it("hace flush solo con pendientes y sin skip", () => {
    expect(shouldFlushAttendanceQueueBeforeRefresh(2)).toBe(true);
  });
});
