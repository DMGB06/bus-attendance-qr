import { AuthRetryableFetchError } from "@supabase/supabase-js";

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

describe("getUser", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lee el usuario de la sesion local sin llamar a la red", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null });

    await expect(getUser()).resolves.toEqual({ id: "u1" });
    expect(remoteGetUser).not.toHaveBeenCalled();
  });

  it("devuelve null sin sesion", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(getUser()).resolves.toBeNull();
  });

  it("offline con token vencido usa el usuario guardado", async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError("Network request failed", 0),
    });
    storageGetItem.mockResolvedValue(JSON.stringify({ user: { id: "u1" } }));

    await expect(getUser()).resolves.toEqual({ id: "u1" });
    expect(storageGetItem).toHaveBeenCalledWith("buscontrol-auth");
  });

  it("propaga errores que no son de red", async () => {
    const error = new Error("refresh token invalido");
    getSession.mockResolvedValue({ data: { session: null }, error });

    await expect(getUser()).rejects.toThrow("refresh token invalido");
  });
});

describe("getSession", () => {
  it("offline con token vencido devuelve la sesion guardada", async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError("Network request failed", 0),
    });
    storageGetItem.mockResolvedValue(JSON.stringify({ user: { id: "u1" } }));

    await expect(authGetSession()).resolves.toMatchObject({ user: { id: "u1" } });
  });
});

describe("logout", () => {
  const signOut = supabase.auth.signOut as jest.Mock;
  const deactivate = deactivatePushTokensForUser as jest.Mock;
  const cleanup = clearLocalSessionData as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null });
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

  it("si signOut falla la sesion sigue activa y conserva sus datos", async () => {
    signOut.mockResolvedValue({ error: new Error("fallo") });

    await expect(logout()).rejects.toThrow("fallo");
    expect(cleanup).not.toHaveBeenCalled();
  });
});
