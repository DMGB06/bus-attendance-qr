import { expect, test } from "vitest";
import { maskDni, maskPhone } from "./mask";

test("teléfono: deja el primer dígito y los últimos 3", () => {
  expect(maskPhone("987654321")).toBe("9•• ••• 321");
  expect(maskPhone("+51 987-654-321")).toBe("9•• ••• 321");
});

test("DNI: deja el primer dígito y los últimos 3", () => {
  expect(maskDni("10000003")).toBe("1•••• 003");
});

test("vacío o muy corto no muestra nada", () => {
  expect(maskPhone(null)).toBe("");
  expect(maskPhone("123")).toBe("");
  expect(maskDni(undefined)).toBe("");
});
