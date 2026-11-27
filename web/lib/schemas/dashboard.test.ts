import { describe, expect, it } from "vitest";
import { enlacesOperacion, resumenOperativoSchema } from "./dashboard";
import { diaLima, fechaViaje, ultimosSieteDiasLima } from "./viajes";

const semana = Array.from({ length: 7 }, (_, i) => ({
  fecha: new Date(Date.UTC(2036, 0, i - 3)).toISOString().slice(0, 10),
  en_curso: 0,
  cerrados: 0,
}));
const datos = { ...semana[6], subidas: 0, ausencias: 0, anulaciones: 0, dias: semana };

describe("resumen operativo", () => {
  it("acepta la semana vacía a través del cambio de mes y año", () => {
    expect(semana[0].fecha).toBe("2035-12-28");
    expect(resumenOperativoSchema.parse(datos)).toEqual(datos);
    expect(fechaViaje(datos.fecha)).toBe("03/01/2036");
  });

  it.each([null, "0", -1, 0.25, 2 ** 53, undefined])("rechaza un conteo inválido (%s)", (subidas) => {
    expect(resumenOperativoSchema.safeParse({ ...datos, subidas }).success).toBe(false);
  });

  it("rechaza fechas imposibles, desordenadas, faltantes y un corte que discrepa", () => {
    for (const cambio of [
      { fecha: "2036-02-30" },
      { dias: [...semana].reverse() },
      { dias: semana.slice(1) },
      { dias: [semana[0], semana[0], ...semana.slice(2)] },
      { fecha: "2036-01-04" },
      { en_curso: 1 },
    ]) {
      expect(resumenOperativoSchema.safeParse({ ...datos, ...cambio }).success).toBe(false);
    }
  });

  it("mantiene la fecha de corte para los enlaces al cruzar medianoche en Lima", () => {
    const antes = new Date("2036-01-04T04:59:59Z");
    const despues = new Date("2036-01-04T05:00:00Z");
    expect(ultimosSieteDiasLima(antes)).toEqual({ desde: "2035-12-28", hasta: datos.fecha });
    expect(diaLima(despues)).toBe("2036-01-04");

    const hoy = "desde=2036-01-03&hasta=2036-01-03";
    expect(enlacesOperacion(resumenOperativoSchema.parse(datos))).toEqual({
      enCurso: `/viajes?${hoy}&estado=active`,
      cerrados: `/viajes?${hoy}&estado=completed`,
      subidas: `/viajes?${hoy}`,
      incidencias: `/incidencias?${hoy}`,
      semana: "/viajes?desde=2035-12-28&hasta=2036-01-03",
    });
  });
});
