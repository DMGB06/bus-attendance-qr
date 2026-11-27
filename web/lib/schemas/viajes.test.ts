import { describe, expect, it } from "vitest";
import { TURNOS, fechaHoraViaje, fechaViaje, filtrosViajes, horaViaje, paginaEventos, urlViajes, viajeId } from "./viajes";

describe("filtros de viajes", () => {
  it("calcula siete días inclusivos con el día actual de Lima", () => {
    const antesDeMedianoche = new Date("2026-11-27T04:59:00Z");
    expect(filtrosViajes({}, antesDeMedianoche).filtros).toMatchObject({ desde: "2026-11-20", hasta: "2026-11-26", page: 1 });
    expect(filtrosViajes({}, new Date("2026-11-27T05:00:00Z")).filtros.hasta).toBe("2026-11-27");
  });

  it("distingue límites vacíos e inválidos y rechaza el rango invertido", () => {
    expect(filtrosViajes({ desde: "", hasta: "2024-02-29" })).toMatchObject({ filtros: { desde: "", hasta: "2024-02-29" }, error: undefined });
    expect(filtrosViajes({ desde: "2025-02-29" }).error).toBe("Ingresa fechas válidas.");
    expect(filtrosViajes({ desde: "2026-11-27", hasta: "2026-11-26" }).error).toMatch(/posterior/);
  });

  it("valida identificadores, enums y páginas independientes", () => {
    expect(viajeId.safeParse("no-es-un-uuid").success).toBe(false);
    expect(filtrosViajes({ bus: "no-es-un-uuid", estado: "otro", page: "10001" }).filtros)
      .toMatchObject({ bus: undefined, estado: undefined, page: 1 });
    expect(paginaEventos({ eventos: "3", page: "2" })).toBe(3);
    expect(paginaEventos({ eventos: "-1" })).toBe(1);
  });

  it("mantiene el contexto del listado en la navegación de eventos", () => {
    const id = "10000000-0000-0000-0000-000000000001";
    const { filtros } = filtrosViajes({ desde: "", hasta: "2026-11-26", bus: id, turno: "mañana", page: "2" });
    const detalle = new URL(urlViajes(filtros, id, 3), "http://localhost");
    expect(detalle.pathname).toBe(`/viajes/${id}`);
    expect(Object.fromEntries(detalle.searchParams)).toEqual({ desde: "", hasta: "2026-11-26", bus: id, turno: "mañana", page: "2", eventos: "3" });
    expect(urlViajes(filtros)).not.toContain("eventos=");
  });
});

it("muestra fechas de calendario y horas de Lima, incluidos los viajes históricos", () => {
  expect(fechaViaje("2026-11-27")).toBe("27/11/2026");
  expect(horaViaje("2026-11-27T04:59:00Z")).toBe("23:59");
  expect(horaViaje("2026-11-27T05:00:00Z")).toBe("00:00");
  expect(fechaHoraViaje("2026-11-27T04:59:00Z")).toMatch(/26\/11\/2026.*23:59/);
  expect(TURNOS.tarde).toBe("Tarde");
  expect(TURNOS.tarde_unica).toBe("Tarde única");
});
