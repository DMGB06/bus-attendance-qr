import { supabase } from "@/src/core/config/supabase";
import { getGuardianPadronStudents } from "@/src/features/parent/services/guardian-students.service";

jest.mock("@/src/core/config/supabase", () => ({
  supabase: { rpc: jest.fn() },
  supabasePublic: { from: jest.fn() },
}));

describe("getGuardianPadronStudents", () => {
  it("avisa el error en vez de responder que no hay hijos", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "Network request failed" },
    });

    await expect(getGuardianPadronStudents([])).rejects.toThrow("No se pudo consultar");
  });

  it("sin vinculos ni error devuelve la lista vacia", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    await expect(getGuardianPadronStudents([])).resolves.toEqual([]);
  });
});
