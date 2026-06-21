import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";

describe("getLocalTodayDateIso", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("usa la fecha de Perú, no UTC, en la franja nocturna local", () => {
    // 19:40 en Lima = 00:40 UTC del día siguiente
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-20T00:40:00.000Z"));

    expect(getLocalTodayDateIso()).toBe("2026-06-19");
  });

  it("coincide con el día calendario local en horario diurno", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-19T15:00:00.000Z"));

    expect(getLocalTodayDateIso()).toBe("2026-06-19");
  });
});
