import { filterRosterItemsByQuery } from "@/src/features/trips/utils/roster-filter.utils";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

const item = (id: string, nombre_alumno: string, codigo: string | null = null) =>
  ({ student: { id, nombre_alumno, codigo } }) as unknown as TripRosterItem;

const items = [
  item("a1b2c3d4-0000-4000-8000-000000000001", "José Núñez", "BU0001"),
  item("a1b2c3d4-0000-4000-8000-000000000002", "Ana Alva", "BU0002"),
];

const names = (query: string) =>
  filterRosterItemsByQuery(items, query).map((entry) => entry.student.nombre_alumno);

describe("filterRosterItemsByQuery", () => {
  it("encuentra el nombre aunque se escriba sin tildes", () => {
    expect(names("jose nunez")).toEqual(["José Núñez"]);
  });

  it("encuentra el nombre aunque se escriba con tildes de mas", () => {
    expect(names("Ána")).toEqual(["Ana Alva"]);
  });

  it("no coincide por el identificador interno", () => {
    expect(names("a1b2c3d4")).toEqual([]);
  });

  it("sigue buscando por codigo", () => {
    expect(names("bu0002")).toEqual(["Ana Alva"]);
  });
});
