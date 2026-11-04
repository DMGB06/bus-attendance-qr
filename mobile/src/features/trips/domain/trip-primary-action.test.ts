import { getTripPrimaryAction } from "@/src/features/trips/domain/trip-primary-action";

const chofer = { canScan: true, canBulkDropoff: true, canCloseTrip: true };
const asistenta = { canScan: true, canBulkDropoff: true, canCloseTrip: false };

describe("getTripPrimaryAction", () => {
  it("con pendientes lo principal es escanear", () => {
    expect(getTripPrimaryAction({ pendingCount: 2, onboardCount: 3 }, chofer)).toBe("scan");
  });

  it("sin pendientes y con alumnos a bordo es dejar a todos", () => {
    expect(getTripPrimaryAction({ pendingCount: 0, onboardCount: 3 }, asistenta)).toBe("bulk");
  });

  it("sin pendientes ni a bordo el chofer cierra el viaje", () => {
    expect(getTripPrimaryAction({ pendingCount: 0, onboardCount: 0 }, chofer)).toBe("close");
  });

  it("la asistenta no tiene accion de cierre", () => {
    expect(getTripPrimaryAction({ pendingCount: 0, onboardCount: 0 }, asistenta)).toBeNull();
  });
});
