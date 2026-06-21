import {
  buildStudentActivitySummary,
  groupEventsByStudent,
} from "@/src/features/trips/domain/activity-student-grouping";
import type { OperatorActivityRow } from "@/src/features/trips/types/activity.types";

function makeEvent(
  overrides: Partial<OperatorActivityRow> & Pick<OperatorActivityRow, "recordId" | "studentId" | "studentName">,
): OperatorActivityRow {
  return {
    tripId: "trip-1",
    tripDate: "2026-06-14",
    tripDirection: "recojo",
    turnType: "mañana",
    tripStatus: "closed",
    eventType: "subio",
    scannedAt: "2026-06-14T07:30:00.000Z",
    scannedBy: null,
    voidedAt: null,
    isOfflineSync: false,
    ...overrides,
  };
}

describe("groupEventsByStudent", () => {
  it("agrupa eventos del mismo alumno y ordena alfabéticamente", () => {
    const groups = groupEventsByStudent([
      makeEvent({ recordId: "r1", studentId: "s2", studentName: "Zoe Zumaeta" }),
      makeEvent({ recordId: "r2", studentId: "s1", studentName: "Ana Alva", eventType: "bajo" }),
      makeEvent({
        recordId: "r3",
        studentId: "s1",
        studentName: "Ana Alva",
        eventType: "subio",
        scannedAt: "2026-06-14T06:30:00.000Z",
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.studentName).toBe("Ana Alva");
    expect(groups[0]?.events).toHaveLength(2);
    expect(groups[1]?.studentName).toBe("Zoe Zumaeta");
  });

  it("ordena eventos del alumno por hora descendente", () => {
    const groups = groupEventsByStudent([
      makeEvent({
        recordId: "r1",
        studentId: "s1",
        studentName: "Ana Alva",
        scannedAt: "2026-06-14T06:00:00.000Z",
      }),
      makeEvent({
        recordId: "r2",
        studentId: "s1",
        studentName: "Ana Alva",
        eventType: "bajo",
        scannedAt: "2026-06-14T08:00:00.000Z",
      }),
    ]);

    expect(groups[0]?.events[0]?.recordId).toBe("r2");
    expect(groups[0]?.events[1]?.recordId).toBe("r1");
  });
});

describe("buildStudentActivitySummary", () => {
  it("resume un solo evento con acción y hora", () => {
    const summary = buildStudentActivitySummary({
      studentId: "s1",
      studentName: "Ana Alva",
      listKey: "s1",
      events: [
        makeEvent({
          recordId: "r1",
          studentId: "s1",
          studentName: "Ana Alva",
          scannedAt: "2026-06-14T12:34:00.000Z",
        }),
      ],
    });

    expect(summary).toContain("Subió al bus");
    expect(summary).toContain("·");
  });

  it("resume varios eventos con tags compactos", () => {
    const summary = buildStudentActivitySummary({
      studentId: "s1",
      studentName: "Ana Alva",
      listKey: "s1",
      events: [
        makeEvent({
          recordId: "r2",
          studentId: "s1",
          studentName: "Ana Alva",
          eventType: "bajo",
          scannedAt: "2026-06-14T08:00:00.000Z",
        }),
        makeEvent({
          recordId: "r1",
          studentId: "s1",
          studentName: "Ana Alva",
          scannedAt: "2026-06-14T07:00:00.000Z",
        }),
      ],
    });

    expect(summary).toContain("Colegio");
    expect(summary).toContain("Subió");
    expect(summary).toContain("·");
  });
});
