import { OPS_ROUTES, PARENT_ROUTES } from "@/src/core/routes";
import { resolvePostLoginHref } from "@/src/features/auth/services/post-login-route.service";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { AppRole } from "@/src/features/profile/types";

jest.mock("@/src/features/parent/services/guardians.service", () => ({
  getGuardianLinksForUser: jest.fn(),
}));
jest.mock("@/src/features/profile/services/profile.service", () => ({
  getProfileById: jest.fn(),
}));

jest.mock("@/src/features/profile/storage/profile-cache.storage", () => ({
  loadCachedProfile: jest.fn(),
}));

const profile = getProfileById as jest.Mock;
const links = getGuardianLinksForUser as jest.Mock;

describe("resolvePostLoginHref", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    links.mockResolvedValue([]);
  });

  it("lleva al padre a su inicio", async () => {
    profile.mockResolvedValue({ app_role: AppRole.PADRE, is_active: true });

    await expect(resolvePostLoginHref("u1")).resolves.toBe(PARENT_ROUTES.home);
  });

  it("lleva al operador a viaje", async () => {
    profile.mockResolvedValue({ app_role: AppRole.CHOFER, is_active: true });

    await expect(resolvePostLoginHref("u1")).resolves.toBe(OPS_ROUTES.trip);
  });

  it("sin rol pero con hijos vinculados va a padre", async () => {
    profile.mockResolvedValue(null);
    links.mockResolvedValue([{ id: "l1" }]);

    await expect(resolvePostLoginHref("u1")).resolves.toBe(PARENT_ROUTES.home);
  });

  it("sin rol ni hijos no entra a la vista de operador", async () => {
    profile.mockResolvedValue(null);

    await expect(resolvePostLoginHref("u1")).resolves.toBeNull();
  });

  it("una cuenta inactiva no entra a la vista de operador", async () => {
    profile.mockResolvedValue({ app_role: AppRole.CHOFER, is_active: false });

    await expect(resolvePostLoginHref("u1")).resolves.toBeNull();
  });

  it("si no pudo consultar el perfil avisa con error", async () => {
    profile.mockRejectedValue(new Error("Network request failed"));

    await expect(resolvePostLoginHref("u1")).rejects.toThrow("Network request failed");
  });

  it("si no pudo consultar los vinculos avisa con error", async () => {
    profile.mockResolvedValue(null);
    links.mockRejectedValue(new Error("Network request failed"));

    await expect(resolvePostLoginHref("u1")).rejects.toThrow("Network request failed");
  });
});
