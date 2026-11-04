import { supabase } from "@/src/core/config/supabase";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";

jest.mock("@/src/core/config/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/src/features/trips/services/students.service", () => ({ getStudentById: jest.fn() }));

type Result = { data: unknown; error: unknown };

function mockTables(tables: Record<string, Result>) {
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    const result = tables[table];
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      maybeSingle: async () => result,
      then: (onFulfilled: (value: Result) => unknown) => Promise.resolve(result).then(onFulfilled),
    };
    return builder;
  });
}

const link = (id: string, student_id: string) => ({ id, student_id, relationship: "padre", is_primary: true });

describe("getGuardianLinksForUser", () => {
  it("une ambas tablas de vinculos sin repetir alumnos", async () => {
    mockTables({
      bus_guardians: { data: { id: "g1" }, error: null },
      bus_student_guardians: { data: [link("c1", "stu-1")], error: null },
      student_guardians: { data: [link("s1", "stu-1"), link("s2", "stu-2")], error: null },
    });

    const links = await getGuardianLinksForUser("u1");

    expect(links.map((row) => [row.student_id, row.source])).toEqual([
      ["stu-1", "bus_student_guardians"],
      ["stu-2", "student_guardians"],
    ]);
  });

  it("funciona sin apoderado en el catalogo", async () => {
    mockTables({
      bus_guardians: { data: null, error: null },
      student_guardians: { data: [link("s1", "stu-1")], error: null },
    });

    const links = await getGuardianLinksForUser("u1");

    expect(links.map((row) => row.student_id)).toEqual(["stu-1"]);
  });
});
