import { formatLocationAge, hasValidCoordinates } from "@/src/features/trips/domain/location-labels";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

describe("location-labels", () => {
  it("resume la antiguedad de la ubicacion", () => {
    expect(formatLocationAge(minutesAgo(0))).toBe("Actualizado hace un momento");
    expect(formatLocationAge(minutesAgo(1))).toBe("Actualizado hace 1 min");
    expect(formatLocationAge(minutesAgo(5))).toBe("Actualizado hace 5 min");
  });

  it("sin fecha valida avisa que no hay ubicacion", () => {
    expect(formatLocationAge(null)).toBe("Sin ubicación reciente");
    expect(formatLocationAge("no es fecha")).toBe("Sin ubicación reciente");
  });

  it("valida las coordenadas", () => {
    expect(hasValidCoordinates(-12.1, -77)).toBe(true);
    expect(hasValidCoordinates(0, 0)).toBe(true);
    expect(hasValidCoordinates(null, -77)).toBe(false);
    expect(hasValidCoordinates(Number.NaN, -77)).toBe(false);
  });
});
