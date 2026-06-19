import { isOperatorPermissionError } from "@/src/features/trips/domain/operator-permission-errors";

describe("isOperatorPermissionError", () => {
  it("detecta errores de asignación al bus", () => {
    expect(isOperatorPermissionError("No estás asignado a este bus hoy.")).toBe(true);
    expect(isOperatorPermissionError("No tienes un bus asignado para hoy")).toBe(true);
  });

  it("ignora otros errores", () => {
    expect(isOperatorPermissionError("No se pudo registrar la asistencia.")).toBe(false);
    expect(isOperatorPermissionError(null)).toBe(false);
  });
});
