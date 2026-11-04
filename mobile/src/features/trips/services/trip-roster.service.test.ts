import { supabase, supabasePublic } from "@/src/core/config/supabase";
import { getTripRoster } from "@/src/features/trips/services/trip-roster.service";
import { saveCachedStudents } from "@/src/features/trips/storage/roster-cache.storage";

function chain(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order"]) {
    query[method] = () => query;
  }
  query.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return query;
}

jest.mock("@/src/core/config/supabase", () => ({
  supabase: { from: jest.fn() },
  supabasePublic: { from: jest.fn() },
}));
jest.mock("@/src/features/trips/storage/roster-cache.storage", () => ({
  saveCachedStudents: jest.fn(async () => undefined),
  saveCachedTripAttendance: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/trips/services/trip-roster-merge.service", () => ({
  buildRosterItemsFromSources: jest.fn(async () => []),
}));

describe("getTripRoster", () => {
  it("una respuesta sin alumnos no borra el padron guardado", async () => {
    (supabasePublic.from as jest.Mock).mockReturnValue(chain({ data: [], error: null }));
    (supabase.from as jest.Mock).mockReturnValue(chain({ data: [], error: null }));

    await getTripRoster("t1");

    expect(saveCachedStudents).not.toHaveBeenCalled();
  });
});
