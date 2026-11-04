import { AuthRetryableFetchError } from "@supabase/supabase-js";

import { supabase } from "@/src/core/config/supabase";
import { supabaseAuthStorage } from "@/src/core/config/supabase-auth-storage";
import { getUser } from "@/src/features/auth/services/auth.service";

jest.mock("@/src/core/config/supabase", () => ({
  supabase: { auth: { getSession: jest.fn(), getUser: jest.fn() } },
}));
jest.mock("@/src/core/config/supabase-auth-storage", () => ({
  supabaseAuthStorage: { getItem: jest.fn() },
}));
jest.mock("@/src/features/auth/services/session-cleanup.service", () => ({
  clearLocalSessionData: jest.fn(),
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
