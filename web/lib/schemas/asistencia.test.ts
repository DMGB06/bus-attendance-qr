import { describe, expect, it } from "vitest";
import { filtrosAsistencia, horaRegistro, urlAsistencia } from "./asistencia";

const alumno = "43000000-0000-0000-1000-000000000001";

describe("parámetros de asistencia", () => {
  it("abre Datos del alumno por defecto y solo reconoce la vista de Asistencia", () => {
    expect(filtrosAsistencia({}).vista).toBeUndefined();
    expect(filtrosAsistencia({ vista: "otra" }).vista).toBeUndefined();
    expect(filtrosAsistencia({ vista: ["asistencia", "otra"] }).vista).toBeUndefined();
    expect(filtrosAsistencia({ vista: "asistencia" }).vista).toBe("asistencia");
  });

  it("incluye hoy y los seis días anteriores según la medianoche de Lima", () => {
    const antes = filtrosAsistencia({}, new Date("2030-01-01T04:59:59Z"));
    expect(antes.filtros).toMatchObject({ desde: "2029-12-25", hasta: "2029-12-31", page: 1 });
    expect(antes.filtrado).toBe(false);
    const despues = filtrosAsistencia({}, new Date("2030-01-01T05:00:00Z"));
    expect(despues.filtros).toMatchObject({ desde: "2029-12-26", hasta: "2030-01-01" });
  });

  it("acepta fechas abiertas y valida el calendario y el orden de los límites", () => {
    expect(filtrosAsistencia({ desde: "", hasta: "2028-02-29" })).toMatchObject({
      filtros: { desde: "", hasta: "2028-02-29" }, error: undefined, filtrado: true,
    });
    expect(filtrosAsistencia({ desde: "", hasta: "" }).filtros).toMatchObject({ desde: "", hasta: "" });
    for (const desde of ["2029-02-29", "2028-02-30", "0000-01-01", ["2028-01-01", "2028-02-01"]]) {
      expect(filtrosAsistencia({ desde }).error).toBe("Ingresa fechas válidas.");
    }
    expect(filtrosAsistencia({ desde: "2030-01-02", hasta: "2030-01-01" }).error).toContain("posterior");
  });

  it("valida las claves del catálogo y normaliza la página", () => {
    expect(filtrosAsistencia({ turno: "mañana", evento: "manual", page: "2" }).filtros)
      .toMatchObject({ turno: "mañana", evento: "manual", page: 2 });
    for (const page of ["0", "1.5", "1e2", "107374184", ["2", "3"]]) {
      expect(filtrosAsistencia({ turno: "Recojo mañana", evento: "roto", page }).filtros)
        .toMatchObject({ turno: undefined, evento: undefined, page: 1 });
    }
  });

  it("mantiene la vista, los filtros y la paginación en el enlace de la ficha", () => {
    const { filtros } = filtrosAsistencia({ desde: "2030-01-01", hasta: "", turno: "mañana", evento: "subio", page: "2" });
    const url = new URL(urlAsistencia(alumno, filtros), "http://localhost");
    expect(url.pathname).toBe(`/alumnos/${alumno}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      vista: "asistencia", desde: "2030-01-01", hasta: "", turno: "mañana", evento: "subio", page: "2",
    });
    expect(urlAsistencia(alumno, { ...filtros, page: 1 })).not.toContain("page=");
    expect(urlAsistencia(alumno)).toBe(`/alumnos/${alumno}?vista=asistencia`);
  });
});

it("muestra la fecha de la hora registrada solo si cambia el día en Lima", () => {
  expect(horaRegistro("2030-01-01", "2030-01-02T04:59:00Z")).toBe("23:59");
  expect(horaRegistro("2030-01-01", "2030-01-02T05:01:00Z")).toMatch(/02\/01\/2030.*00:01/);
  expect(horaRegistro("2030-01-01", null)).toBe("—");
});
