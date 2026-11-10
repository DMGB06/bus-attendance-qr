import { expect, test } from "vitest";
import { anioCarnet, estadoCarnet } from "./estado";

const hoy = new Date("2026-06-15T12:00:00Z");

test("emitido este año: vigente", () => {
  expect(estadoCarnet({ status: "vigente", issued_at: "2026-03-12T15:00:00Z" }, hoy)).toBe("vigente");
});

test("emitido el año pasado: vencido", () => {
  expect(estadoCarnet({ status: "vigente", issued_at: "2025-03-12T15:00:00Z" }, hoy)).toBe("vencido");
});

test("31/12 a las 22:00 en Lima ya es 2025 aunque en UTC sea 2026", () => {
  const issued = "2026-01-01T03:00:00Z"; // 31/12/2025 22:00 en Lima
  expect(anioCarnet(issued)).toBe(2025);
  expect(estadoCarnet({ status: "vigente", issued_at: issued }, new Date("2026-01-01T06:00:00Z"))).toBe("vencido"); // 01/01/2026 01:00 en Lima
});

test("los estados cerrados no cambian con el año", () => {
  expect(estadoCarnet({ status: "reemplazado", issued_at: "2020-01-01T00:00:00Z" }, hoy)).toBe("reemplazado");
  expect(estadoCarnet({ status: "reportado_perdido", issued_at: "2020-01-01T00:00:00Z" }, hoy)).toBe("reportado_perdido");
});
