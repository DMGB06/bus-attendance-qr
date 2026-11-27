import { describe, expect, it } from "vitest";
import { horaRegistro } from "./asistencia";
import { TIPOS_INCIDENCIA, enlaceAsistenciaIncidencia, filtrosIncidencias, urlIncidencias } from "./incidencias";

const bus = "46000000-0000-0000-1000-000000000001";

describe("Incidencias", () => {
  it("incluye hoy y los seis días anteriores según la medianoche de Lima", () => {
    expect(filtrosIncidencias({}, new Date("2036-01-01T04:59:59Z"))).toMatchObject({
      filtros: { desde: "2035-12-25", hasta: "2035-12-31", page: 1 }, filtrado: false,
    });
    expect(filtrosIncidencias({}, new Date("2036-01-01T05:00:00Z")).filtros)
      .toMatchObject({ desde: "2035-12-26", hasta: "2036-01-01" });
  });

  it("conserva los filtros válidos y distingue fechas y parámetros inválidos", () => {
    for (const desde of ["2036-02-30", "0000-01-01", ["2036-01-01", "2036-02-01"]]) {
      expect(filtrosIncidencias({ desde, bus, turno: "mañana" })).toMatchObject({
        filtros: { bus, turno: "mañana" }, error: "Ingresa fechas válidas.", filtrado: true,
      });
    }
    expect(filtrosIncidencias({ desde: "2036-05-02", hasta: "2036-05-01" }).error).toContain("posterior");
    expect(filtrosIncidencias({ bus: "no-es-uuid" }).error).toBe("Revisa los filtros de incidencias.");
    expect(filtrosIncidencias({ tipo: "bajada" }).error).toBe("Revisa los filtros de incidencias.");
  });

  it("serializa fecha abierta, bus, turno, tipo y página sin cambiar el contexto", () => {
    const { filtros } = filtrosIncidencias({ desde: "", hasta: "2036-05-01", bus, turno: "mañana", tipo: "anulacion", page: "9" });
    expect(filtros.page).toBe(9);
    const q = new URL(urlIncidencias(filtros), "http://localhost");
    expect(q.pathname).toBe("/incidencias");
    expect(Object.fromEntries(q.searchParams)).toEqual({ desde: "", hasta: "2036-05-01", bus, turno: "mañana", tipo: "anulacion", page: "9" });
    for (const page of ["0", "1.2", "1e2", "107374184", ["1", "2"]]) {
      expect(filtrosIncidencias({ page }).filtros.page).toBe(1);
    }
  });

  it("abre la asistencia del día del viaje aunque el registro ya no esté en la semana inicial", () => {
    expect(enlaceAsistenciaIncidencia(bus, "2020-05-01"))
      .toBe(`/alumnos/${bus}?vista=asistencia&desde=2020-05-01&hasta=2020-05-01`);
  });

  it("distingue los tipos y muestra la fecha al cambiar el día de la incidencia", () => {
    expect(TIPOS_INCIDENCIA).toEqual({ ausencia: "Ausencia registrada", anulacion: "Evento anulado" });
    expect(horaRegistro("2036-05-01", null)).toBe("—");
    expect(horaRegistro("2036-05-01", "2036-05-02T04:59:00Z")).toBe("23:59");
    expect(horaRegistro("2036-05-01", "2036-05-02T05:02:00Z")).toMatch(/02\/05\/2036.*00:02/);
  });
});
