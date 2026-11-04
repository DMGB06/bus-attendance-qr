import { supabase, supabasePublic } from "@/src/core/config/supabase";
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

  it("la consulta de respaldo tambien excluye a los alumnos inactivos", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: "x" } });
    const not = jest.fn(async () => ({ data: [], error: null }));
    (supabasePublic.from as jest.Mock).mockReturnValue({
      select: () => ({ in: () => ({ not }) }),
    });

    await getGuardianPadronStudents(["11111111-1111-4111-8111-111111111111"]);

    expect(not).toHaveBeenCalledWith("activo", "is", false);
  });
});
