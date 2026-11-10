import { expect, test } from "vitest";
import { A4, MICA, paginas, posicion, validarCarnet } from "./layout";

test("9 carnets ocupan 2 hojas; 8 caben en una; 0 sigue siendo 1 hoja", () => {
  expect(paginas(8)).toBe(1);
  expect(paginas(9)).toBe(2);
  expect(paginas(16)).toBe(2);
  expect(paginas(17)).toBe(3);
  expect(paginas(0)).toBe(1);
});

test("los 8 carnets de una hoja caben dentro del A4 sin pisarse, con margen de al menos 5 mm", () => {
  const celdas = Array.from({ length: 8 }, (_, i) => posicion(i));
  for (const p of celdas) {
    expect(p.pagina).toBe(0);
    expect(p.x).toBeGreaterThanOrEqual(5);
    expect(p.y).toBeGreaterThanOrEqual(5);
    expect(p.x + MICA.w).toBeLessThanOrEqual(A4.w - 5);
    expect(p.y + MICA.h).toBeLessThanOrEqual(A4.h - 5);
  }
  expect(new Set(celdas.map((p) => `${p.x},${p.y}`)).size).toBe(8);
});

test("el carnet 9 abre la hoja siguiente en la primera celda", () => {
  expect(posicion(8)).toEqual({ ...posicion(0), pagina: 1 });
  expect(posicion(16).pagina).toBe(2);
});

test("un carnet sin código lanza error y no imprime 'BUnull'", () => {
  expect(() => validarCarnet({ codigo: "", nombre: "Ana", anio: 2026 })).toThrow("codigo vacío");
  expect(() => validarCarnet({ codigo: "   ", nombre: "Ana", anio: 2026 })).toThrow("codigo vacío");
  expect(() => validarCarnet({ codigo: null as unknown as string, nombre: "Ana", anio: 2026 })).toThrow("codigo vacío");
});

test("validarCarnet normaliza el código y el nombre a mayúsculas y rechaza datos inválidos", () => {
  expect(validarCarnet({ codigo: " bu0098 ", nombre: "Ana Quispe", anio: 2026 })).toEqual({ codigo: "BU0098", nombre: "ANA QUISPE", anio: 2026 });
  expect(() => validarCarnet({ codigo: "BU1", nombre: " ", anio: 2026 })).toThrow("nombre vacío");
  expect(() => validarCarnet({ codigo: "BU1", nombre: "Ana", anio: 26 })).toThrow("año inválido");
});
