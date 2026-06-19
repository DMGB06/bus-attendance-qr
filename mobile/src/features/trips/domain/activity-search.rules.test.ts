import {
  filterGroupedDaysByStudentName,
  getActivitySearchEmptyMessage,
  getActivitySearchTokens,
  normalizeActivitySearchText,
  studentNameMatchesSearch,
} from "@/src/features/trips/domain/activity-search.rules";
import type { ActivityDayGroup } from "@/src/features/trips/types/activity.types";

describe("normalizeActivitySearchText", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeActivitySearchText("  Martínez  ")).toBe("martinez");
    expect(normalizeActivitySearchText("Ñaupa")).toBe("naupa");
  });
});

describe("getActivitySearchTokens", () => {
  it("divide por palabras", () => {
    expect(getActivitySearchTokens("  maria   lopez ")).toEqual(["maria", "lopez"]);
  });
});

describe("studentNameMatchesSearch", () => {
  it("encuentra apellido parcial sin acentos", () => {
    expect(studentNameMatchesSearch("Cristofer Martínez Ñaupa", "martinez")).toBe(true);
    expect(studentNameMatchesSearch("Cristofer Martínez Ñaupa", "naupa")).toBe(true);
  });

  it("requiere que todas las palabras coincidan", () => {
    expect(studentNameMatchesSearch("María López", "maria lopez")).toBe(true);
    expect(studentNameMatchesSearch("María López", "maria garcia")).toBe(false);
  });

  it("búsqueda vacía coincide con todo", () => {
    expect(studentNameMatchesSearch("María López", "")).toBe(true);
    expect(studentNameMatchesSearch("María López", "   ")).toBe(true);
  });
});

describe("filterGroupedDaysByStudentName", () => {
  const groupedDays: ActivityDayGroup[] = [
    {
      date: "2026-06-14",
      dateLabel: "Hoy",
      trips: [
        {
          tripId: "t1",
          title: "Recojo mañana",
          events: [
            {
              recordId: "r1",
              tripId: "t1",
              tripDate: "2026-06-14",
              tripDirection: "recojo",
              turnType: "mañana",
              tripStatus: "completed",
              studentId: "s1",
              studentName: "Cristofer Martínez Ñaupa",
              eventType: "subio",
              scannedAt: "2026-06-14T07:42:00.000Z",
              scannedBy: null,
              voidedAt: null,
              isOfflineSync: false,
            },
            {
              recordId: "r2",
              tripId: "t1",
              tripDate: "2026-06-14",
              tripDirection: "recojo",
              turnType: "mañana",
              tripStatus: "completed",
              studentId: "s2",
              studentName: "María López",
              eventType: "subio",
              scannedAt: "2026-06-14T08:00:00.000Z",
              scannedBy: null,
              voidedAt: null,
              isOfflineSync: false,
            },
          ],
        },
      ],
    },
    {
      date: "2026-06-13",
      dateLabel: "Ayer",
      trips: [
        {
          tripId: "t2",
          title: "Tarde primaria",
          events: [
            {
              recordId: "r3",
              tripId: "t2",
              tripDate: "2026-06-13",
              tripDirection: "retorno",
              turnType: "tarde_primaria",
              tripStatus: "completed",
              studentId: "s1",
              studentName: "Cristofer Martínez Ñaupa",
              eventType: "bajo",
              scannedAt: "2026-06-13T14:05:00.000Z",
              scannedBy: null,
              voidedAt: null,
              isOfflineSync: false,
            },
          ],
        },
      ],
    },
  ];

  it("filtra eventos y oculta días/viajes sin coincidencias", () => {
    const filtered = filterGroupedDaysByStudentName(groupedDays, "martinez");

    expect(filtered).toHaveLength(2);
    expect(filtered[0].trips[0].events).toHaveLength(1);
    expect(filtered[0].trips[0].events[0].studentName).toContain("Martínez");
    expect(filtered[1].trips[0].events).toHaveLength(1);
  });

  it("devuelve la semana completa si la búsqueda está vacía", () => {
    expect(filterGroupedDaysByStudentName(groupedDays, "")).toEqual(groupedDays);
  });

  it("devuelve vacío si no hay coincidencias", () => {
    expect(filterGroupedDaysByStudentName(groupedDays, "zzzz")).toEqual([]);
  });
});

describe("getActivitySearchEmptyMessage", () => {
  it("incluye el término buscado", () => {
    expect(getActivitySearchEmptyMessage("martinez")).toBe(
      "Ningún alumno coincide con «martinez» en estos 7 días.",
    );
  });
});
