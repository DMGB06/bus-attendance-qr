import {
  buildDayOptions,
  formatDayChipLabel,
  getTripsForDate,
  groupActivityByDayAndTrip,
} from "@/src/features/trips/domain/activity-grouping";
import type { OperatorActivityRow } from "@/src/features/trips/types/activity.types";

const todayIso = "2026-06-14";

function row(overrides: Partial<OperatorActivityRow> & Pick<OperatorActivityRow, "recordId" | "tripId" | "tripDate">): OperatorActivityRow {
  return {
    tripDirection: "recojo",
    turnType: "mañana",
    tripStatus: "completed",
    studentId: "student-1",
    studentName: "Alumno Demo",
    eventType: "subio",
    scannedAt: "2026-06-14T07:42:00.000Z",
    scannedBy: null,
    voidedAt: null,
    isOfflineSync: false,
    ...overrides,
  };
}

describe("formatDayChipLabel", () => {
  it("marca hoy y ayer", () => {
    expect(formatDayChipLabel("2026-06-14", todayIso)).toBe("Hoy");
    expect(formatDayChipLabel("2026-06-13", todayIso)).toBe("Ayer");
  });
});

describe("buildDayOptions", () => {
  it("genera 7 días con hoy al final", () => {
    const options = buildDayOptions(todayIso);
    expect(options).toHaveLength(7);
    expect(options[0].date).toBe("2026-06-08");
    expect(options[6].label).toBe("Hoy");
  });
});

describe("groupActivityByDayAndTrip", () => {
  it("agrupa por día y viaje y ordena eventos por hora desc", () => {
    const grouped = groupActivityByDayAndTrip(
      [
        row({
          recordId: "r1",
          tripId: "t1",
          tripDate: "2026-06-14",
          scannedAt: "2026-06-14T08:00:00.000Z",
        }),
        row({
          recordId: "r2",
          tripId: "t1",
          tripDate: "2026-06-14",
          scannedAt: "2026-06-14T07:30:00.000Z",
        }),
        row({
          recordId: "r3",
          tripId: "t2",
          tripDate: "2026-06-13",
          turnType: "tarde_primaria",
          scannedAt: "2026-06-13T14:05:00.000Z",
        }),
      ],
      todayIso,
    );

    expect(grouped).toHaveLength(2);
    expect(grouped[0].date).toBe("2026-06-14");
    expect(grouped[0].trips[0].events.map((event) => event.recordId)).toEqual(["r1", "r2"]);
    expect(grouped[0].trips[0].title).toBe("Recojo mañana");
    expect(grouped[1].trips[0].title).toBe("Tarde primaria");
  });
});

describe("getTripsForDate", () => {
  it("devuelve solo los viajes del día seleccionado", () => {
    const grouped = groupActivityByDayAndTrip(
      [
        row({ recordId: "r1", tripId: "t1", tripDate: "2026-06-14" }),
        row({ recordId: "r2", tripId: "t2", tripDate: "2026-06-13" }),
      ],
      todayIso,
    );

    expect(getTripsForDate(grouped, "2026-06-14")).toHaveLength(1);
    expect(getTripsForDate(grouped, "2026-06-12")).toEqual([]);
  });
});
