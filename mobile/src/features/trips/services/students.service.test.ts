import { supabasePublic } from "@/src/core/config/supabase";
import { refreshStudentGuardianFromPadron } from "@/src/features/trips/services/students.service";
import type { Student } from "@/src/features/trips/types";

function chain(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "not", "order"]) {
    query[method] = () => query;
  }
  query.maybeSingle = async () => result;
  query.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return query;
}

jest.mock("@/src/core/config/supabase", () => ({
  supabase: { from: jest.fn() },
  supabasePublic: { from: jest.fn() },
}));
jest.mock("@/src/features/trips/services/students-cache.service", () => ({
  findStudentInCache: jest.fn(async () => null),
  findStudentInStudentList: jest.fn(),
  searchStudentsInCache: jest.fn(async () => []),
  searchStudentsInStudentList: jest.fn(() => []),
}));

const { supabase } = jest.requireMock("@/src/core/config/supabase");

describe("refreshStudentGuardianFromPadron", () => {
  it("sin red devuelve al alumno como estaba, sin fallar", async () => {
    const failure = { data: null, error: { message: "network" } };
    supabase.from.mockReturnValue(chain(failure));
    (supabasePublic.from as jest.Mock).mockReturnValue(chain(failure));
    const student = { id: "s1", codigo: "BU0001", nombre_alumno: "Ana" } as Student;

    await expect(refreshStudentGuardianFromPadron(student)).resolves.toBe(student);
  });
});
