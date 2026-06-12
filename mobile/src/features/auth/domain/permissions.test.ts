import { AppRole } from "@/src/features/profile/types";
import {
  getCapabilitiesForRole,
  isParentRole,
} from "@/src/features/auth/domain/permissions";

describe("getCapabilitiesForRole", () => {
  it("da permisos completos al chofer", () => {
    const caps = getCapabilitiesForRole(AppRole.CHOFER);

    expect(caps.canStartTrip).toBe(true);
    expect(caps.canCloseTrip).toBe(true);
    expect(caps.canScan).toBe(true);
    expect(caps.isDriver).toBe(true);
    expect(caps.isAssistant).toBe(false);
  });

  it("restringe asistenta sin iniciar ni cerrar viaje", () => {
    const caps = getCapabilitiesForRole(AppRole.ASISTENTA);

    expect(caps.canStartTrip).toBe(false);
    expect(caps.canCloseTrip).toBe(false);
    expect(caps.canScan).toBe(true);
    expect(caps.isAssistant).toBe(true);
  });

  it("bloquea operaciones de campo al padre", () => {
    const caps = getCapabilitiesForRole(AppRole.PADRE);

    expect(caps.canScan).toBe(false);
    expect(caps.canViewRoster).toBe(false);
  });

  it("trata coordinador como chofer operativo", () => {
    const caps = getCapabilitiesForRole(AppRole.COORDINADOR);

    expect(caps.canStartTrip).toBe(true);
    expect(caps.isDriver).toBe(true);
  });

  it("usa permisos de chofer si no hay rol asignado (V1)", () => {
    const caps = getCapabilitiesForRole(null);

    expect(caps.canStartTrip).toBe(true);
  });
});

describe("isParentRole", () => {
  it("identifica padre", () => {
    expect(isParentRole(AppRole.PADRE)).toBe(true);
  });

  it("rechaza otros roles", () => {
    expect(isParentRole(AppRole.CHOFER)).toBe(false);
    expect(isParentRole(undefined)).toBe(false);
  });
});
