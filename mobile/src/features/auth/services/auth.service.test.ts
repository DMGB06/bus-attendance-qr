import { supabase } from "@/src/core/config/supabase";
import { supabaseAuthStorage } from "@/src/core/config/supabase-auth-storage";
import { getSession as authGetSession, getUser, logout } from "@/src/features/auth/services/auth.service";
import { clearLocalSessionData } from "@/src/features/auth/services/session-cleanup.service";
import { deactivatePushTokensForUser } from "@/src/features/notifications/services/push-token.service";

jest.mock("@/src/core/config/supabase", () => ({
  supabase: { auth: { getSession: jest.fn(), getUser: jest.fn(), signOut: jest.fn() } },
}));
jest.mock("@/src/core/config/supabase-auth-storage", () => ({
  supabaseAuthStorage: { getItem: jest.fn() },
}));
jest.mock("@/src/features/auth/services/session-cleanup.service", () => ({
  clearLocalSessionData: jest.fn(),
}));

jest.mock("@/src/features/notifications/services/push-token.service", () => ({
  deactivatePushTokensForUser: jest.fn(),
}));

const getSession = supabase.auth.getSession as jest.Mock;
const remoteGetUser = supabase.auth.getUser as jest.Mock;
const storageGetItem = supabaseAuthStorage.getItem as jest.Mock;

describe("getUser y getSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("leen el usuario guardado sin esperar a la libreria de auth", async () => {
    storageGetItem.mockResolvedValue(JSON.stringify({ user: { id: "u1" } }));

    await expect(getUser()).resolves.toEqual({ id: "u1" });
    await expect(authGetSession()).resolves.toMatchObject({ user: { id: "u1" } });
    expect(getSession).not.toHaveBeenCalled();
    expect(remoteGetUser).not.toHaveBeenCalled();
    expect(storageGetItem).toHaveBeenCalledWith("buscontrol-auth");
  });

  it("devuelven null sin sesion guardada", async () => {
    storageGetItem.mockResolvedValue(null);

    await expect(getUser()).resolves.toBeNull();
  });

  it("devuelven null si lo guardado esta corrupto", async () => {
    storageGetItem.mockResolvedValue("{no es json");

    await expect(authGetSession()).resolves.toBeNull();
  });
});

describe("logout", () => {
  const signOut = supabase.auth.signOut as jest.Mock;
  const deactivate = deactivatePushTokensForUser as jest.Mock;
  const cleanup = clearLocalSessionData as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    storageGetItem.mockResolvedValue(JSON.stringify({ user: { id: "u1" } }));
    signOut.mockResolvedValue({ error: null });
    deactivate.mockResolvedValue(undefined);
    cleanup.mockResolvedValue(undefined);
  });

  it("desactiva el token push antes de cerrar la sesion", async () => {
    await logout();

    expect(deactivate).toHaveBeenCalledWith("u1");
    expect(deactivate.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
    expect(cleanup).toHaveBeenCalled();
  });

  it("cierra sesion aunque falle desactivar el token", async () => {
    deactivate.mockRejectedValue(new Error("Network request failed"));

    await expect(logout()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalled();
  });

  it("sin red no deja colgado el boton de cerrar sesion", async () => {
    jest.useFakeTimers();
    signOut.mockReturnValue(new Promise(() => undefined));

    const pending = logout();
    const assertion = expect(pending).rejects.toThrow("timeout");
    await jest.advanceTimersByTimeAsync(8_000);

    await assertion;
    expect(cleanup).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("si signOut falla la sesion sigue activa y conserva sus datos", async () => {
    signOut.mockResolvedValue({ error: new Error("fallo") });

    await expect(logout()).rejects.toThrow("fallo");
    expect(cleanup).not.toHaveBeenCalled();
  });
});
