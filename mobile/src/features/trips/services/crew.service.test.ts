import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import {
  getAssignedBusForToday,
  getScanContextForCurrentUser,
  resolveOperationalBusContext,
} from "@/src/features/trips/services/crew.service";

jest.mock("@/src/core/config/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/src/features/auth/services/auth.service", () => ({ getUser: jest.fn() }));
jest.mock("@/src/features/profile/services/profile.service", () => ({ getProfileById: jest.fn() }));

type Result = { data: unknown; error: unknown };
type Filters = Record<string, unknown>;

function mockTables(tables: Record<string, Result | ((filters: Filters) => Result)>) {
  const seen: Record<string, Filters> = {};
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    const filters: Filters = {};
    seen[table] = filters;
    const resolve = (): Result => {
      const entry = tables[table];
      return typeof entry === "function" ? entry(filters) : entry;
    };
    const builder = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      maybeSingle: async () => resolve(),
      then: (onFulfilled: (value: Result) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    return builder;
  });
  return seen;
}

const bus = (id: string, code: string) => ({ id, code, plate: null, label: code, is_active: true });
const user = { id: "u1", email: "a@b.c" };

describe("crew.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUser as jest.Mock).mockResolvedValue(user);
    (getProfileById as jest.Mock).mockResolvedValue({ app_role: "chofer" });
  });

  afterEach(() => jest.useRealTimers());

  it("consulta la asignacion con la fecha de Lima, no UTC", async () => {
    jest.useFakeTimers({ now: new Date("2026-03-10T02:00:00.000Z") });
    const seen = mockTables({
      bus_crew_assignments: { data: [], error: null },
      bus_units: { data: [bus("b1", "BUS-01")], error: null },
    });

    await getAssignedBusForToday("u1");

    expect(seen.bus_crew_assignments.assignment_date).toBe("2026-03-09");
  });

  it("prefiere la asignacion de chofer si hay varias", async () => {
    mockTables({
      bus_crew_assignments: {
        data: [
          { bus_id: "b2", crew_role: "asistenta" },
          { bus_id: "b1", crew_role: "chofer" },
        ],
        error: null,
      },
      bus_units: (filters) => ({ data: bus(String(filters.id), "BUS"), error: null }),
    });

    const result = await getAssignedBusForToday("u1");

    expect(result?.crewRole).toBe("chofer");
    expect(result?.bus.id).toBe("b1");
  });

  it("sin asignacion y con varios buses activos no asume BUS-01", async () => {
    mockTables({
      bus_crew_assignments: { data: [], error: null },
      bus_units: { data: [bus("b1", "BUS-01"), bus("b2", "BUS-02")], error: null },
    });

    await expect(resolveOperationalBusContext("u1")).resolves.toBeNull();
  });

  it("un fallo de red al consultar los buses no se confunde con sin bus", async () => {
    mockTables({
      bus_crew_assignments: { data: [], error: null },
      bus_units: { data: null, error: { message: "Network request failed" } },
    });

    await expect(resolveOperationalBusContext("u1")).rejects.toThrow("No se pudo consultar");
  });

  it("modo piloto: un solo bus activo se asigna al operador", async () => {
    mockTables({
      bus_crew_assignments: { data: [], error: null },
      bus_units: { data: [bus("b1", "BUS-01")], error: null },
    });

    const context = await resolveOperationalBusContext("u1");

    expect(context?.busId).toBe("b1");
  });

  it("offline resuelve el contexto de escaneo con el perfil disponible", async () => {
    (getProfileById as jest.Mock).mockResolvedValue({ app_role: "asistenta" });
    mockTables({
      bus_crew_assignments: { data: null, error: { message: "Network request failed" } },
      bus_units: { data: null, error: { message: "Network request failed" } },
    });

    await expect(getScanContextForCurrentUser()).resolves.toEqual({
      scannedBy: "u1",
      scanRole: "asistenta",
    });
  });

  it("offline sin perfil no inventa el rol", async () => {
    (getProfileById as jest.Mock).mockRejectedValue(new Error("Network request failed"));
    mockTables({
      bus_crew_assignments: { data: null, error: { message: "Network request failed" } },
    });

    await expect(getScanContextForCurrentUser()).resolves.toEqual({
      scannedBy: "u1",
      scanRole: null,
    });
  });

  it("sin sesion exige iniciar sesion", async () => {
    (getUser as jest.Mock).mockResolvedValue(null);

    await expect(getScanContextForCurrentUser()).rejects.toThrow("iniciar sesión");
  });
});
