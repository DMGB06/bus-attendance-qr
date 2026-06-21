import { buildActivityListSections } from "@/src/features/trips/domain/activity-list.sections";
import type { ActivityDayGroup, OperatorActivityRow } from "@/src/features/trips/types/activity.types";

function makeEvent(recordId: string, studentId: string, studentName: string): OperatorActivityRow {
  return {
    recordId,
    tripId: "trip-1",
    tripDate: "2026-06-14",
    tripDirection: "recojo",
    turnType: "mañana",
    tripStatus: "closed",
    studentId,
    studentName,
    eventType: "subio",
    scannedAt: "2026-06-14T07:00:00.000Z",
    scannedBy: null,
    voidedAt: null,
    isOfflineSync: false,
  };
}

const sampleDay: ActivityDayGroup[] = [
  {
    date: "2026-06-14",
    dateLabel: "Hoy",
    trips: [
      {
        tripId: "trip-1",
        title: "Recojo mañana",
        events: [
          makeEvent("r1", "s1", "Ana Alva"),
          makeEvent("r2", "s1", "Ana Alva"),
          makeEvent("r3", "s2", "Bruno Baca"),
        ],
      },
    ],
  },
];

describe("buildActivityListSections", () => {
  it("agrupa por alumno en modo día normal", () => {
    const sections = buildActivityListSections(sampleDay, { groupByStudent: true });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.mode).toBe("student");

    if (sections[0]?.mode !== "student") {
      return;
    }

    expect(sections[0].studentCount).toBe(2);
    expect(sections[0].eventCount).toBe(3);
    expect(sections[0].data[0]?.listKey).toBe("2026-06-14-trip-1:s1");
  });

  it("también agrupa por alumno en búsqueda", () => {
    const sections = buildActivityListSections(sampleDay, { groupByStudent: true });

    expect(sections[0]?.mode).toBe("student");

    if (sections[0]?.mode !== "student") {
      return;
    }

    expect(sections[0].studentCount).toBe(2);
    expect(sections[0].data).toHaveLength(2);
  });
});
