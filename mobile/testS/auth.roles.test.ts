/**
 * Auth — permisos por rol.
 */
import { getCapabilitiesForRole } from "@/src/features/auth/domain/permissions";
import { AppRole } from "@/src/features/profile/types";

describe("testS · roles y permisos", () => {
  it("chofer puede cerrar viaje y anular registros", () => {
    const caps = getCapabilitiesForRole(AppRole.CHOFER);
    expect(caps.canCloseTrip).toBe(true);
    expect(caps.canScan).toBe(true);
    expect(caps.isDriver).toBe(true);
  });

  it("asistenta escanea pero no cierra viaje ni anula", () => {
    const caps = getCapabilitiesForRole(AppRole.ASISTENTA);
    expect(caps.canScan).toBe(true);
    expect(caps.canCloseTrip).toBe(false);
    expect(caps.isAssistant).toBe(true);
  });

  it("padre sin permisos operativos", () => {
    const caps = getCapabilitiesForRole(AppRole.PADRE);
    expect(caps.canScan).toBe(false);
    expect(caps.canViewRoster).toBe(false);
  });
});
