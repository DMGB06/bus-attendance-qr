import { supabase } from "@/src/core/config/supabase";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { loadCachedProfile } from "@/src/features/profile/storage/profile-cache.storage";
import type { User } from "@supabase/supabase-js";

jest.mock("@/src/core/config/supabase", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("@/src/features/auth/services/auth.service", () => ({ getUser: jest.fn() }));
jest.mock("@/src/features/profile/storage/profile-cache.storage", () => ({
  loadCachedProfile: jest.fn(),
  saveCachedProfile: jest.fn(),
}));

const user = { id: "u1", email: "a@b.c" } as User;

describe("getProfileById", () => {
  it("con la red colgada usa el perfil guardado sin esperar minutos", async () => {
    jest.useFakeTimers();
    (supabase.rpc as jest.Mock).mockReturnValue(new Promise(() => undefined));
    (loadCachedProfile as jest.Mock).mockResolvedValue({ id: "u1", app_role: "chofer" });

    const pending = getProfileById("u1", user);
    await jest.advanceTimersByTimeAsync(4_000);

    await expect(pending).resolves.toMatchObject({ app_role: "chofer" });
    jest.useRealTimers();
  });
});
