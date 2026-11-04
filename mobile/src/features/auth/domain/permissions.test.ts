import { AppRole } from "@/src/features/profile/types";
import {
  getCapabilitiesForRole,
  getEffectiveRole,
  isParentRole,
} from "@/src/features/auth/domain/permissions";

describe("getCapabilitiesForRole", () => {
  it("sin rol no concede permisos", () => {
    for (const role of [null, undefined]) {
      expect(getCapabilitiesForRole(role).canStartTrip).toBe(false);
      expect(getCapabilitiesForRole(role).canScan).toBe(false);
      expect(getCapabilitiesForRole(role).isDriver).toBe(false);
    }
  });

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

  it("una cuenta inactiva no tiene rol efectivo", () => {
    expect(getEffectiveRole({ app_role: AppRole.CHOFER, is_active: false })).toBeNull();
    expect(getEffectiveRole({ app_role: AppRole.CHOFER, is_active: true })).toBe(AppRole.CHOFER);
    expect(getEffectiveRole(null)).toBeNull();
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
