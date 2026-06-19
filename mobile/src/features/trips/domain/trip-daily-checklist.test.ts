import {
  buildDailyChecklist,
  type DailyChecklistContext,
} from "@/src/features/trips/domain/trip-daily-checklist";

function baseContext(overrides: Partial<DailyChecklistContext>): DailyChecklistContext {
  return {
    hasActiveTrip: false,
    direction: null,
    onboardCount: 0,
    pendingCount: 0,
    completedCount: 0,
    morningRiderPendingCount: 0,
    ...overrides,
  };
}

describe("buildDailyChecklist", () => {
  it("muestra pasos de mañana sin viaje activo", () => {
    const steps = buildDailyChecklist(baseContext({ setupPeriod: "mañana" }));
    expect(steps[0]?.status).toBe("current");
    expect(steps[0]?.label).toMatch(/Iniciar viaje de mañana/);
  });

  it("marca cerrar viaje en recojo cuando ya no hay pendientes ni a bordo", () => {
    const steps = buildDailyChecklist(
      baseContext({
        hasActiveTrip: true,
        direction: "recojo",
        completedCount: 3,
      }),
    );

    const closeStep = steps.find((step) => step.id === "close");
    expect(closeStep?.status).toBe("current");
  });

  it("prioriza alumnos de la mañana en retorno", () => {
    const steps = buildDailyChecklist(
      baseContext({
        hasActiveTrip: true,
        direction: "retorno",
        morningRiderPendingCount: 2,
        pendingCount: 5,
      }),
    );

    expect(steps.find((step) => step.id === "morning_priority")?.status).toBe("current");
  });

  it("marca bajada en casa cuando hay alumnos a bordo en tarde", () => {
    const steps = buildDailyChecklist(
      baseContext({
        hasActiveTrip: true,
        direction: "retorno",
        onboardCount: 4,
      }),
    );

    expect(steps.find((step) => step.id === "scan_dropoff")?.status).toBe("current");
  });
});
