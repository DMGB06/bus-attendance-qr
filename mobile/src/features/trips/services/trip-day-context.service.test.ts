import { supabase } from "@/src/core/config/supabase";
import {
  clearMorningHintsCache,
  getMorningAttendanceHints,
} from "@/src/features/trips/services/trip-day-context.service";

jest.mock("@/src/core/config/supabase", () => ({ supabase: { from: jest.fn() } }));

const isFilters: [string, unknown][] = [];

function mockTables() {
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    const result =
      table === "bus_trips"
        ? { data: [{ id: "t1" }], error: null }
        : {
            data: [
              { trip_id: "t1", student_id: "stu-1", event_type: "subio" },
              { trip_id: "t1", student_id: "stu-1", event_type: "bajo" },
            ],
            error: null,
          };
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      is: (column: string, value: unknown) => {
        isFilters.push([column, value]);
        return builder;
      },
      then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
    };
    return builder;
  });
}

describe("getMorningAttendanceHints", () => {
  beforeEach(() => {
    clearMorningHintsCache();
    jest.clearAllMocks();
    isFilters.length = 0;
    mockTables();
  });

  afterEach(() => jest.useRealTimers());

  it("no cuenta registros anulados", async () => {
    await getMorningAttendanceHints("2026-06-21");

    expect(isFilters).toContainEqual(["voided_at", null]);
  });

  it("vuelve a consultar cuando la cache vence", async () => {
    jest.useFakeTimers({ now: new Date("2026-06-21T12:00:00Z") });
    await getMorningAttendanceHints("2026-06-21");
    const callsAfterFirst = (supabase.from as jest.Mock).mock.calls.length;

    await getMorningAttendanceHints("2026-06-21");
    expect((supabase.from as jest.Mock).mock.calls.length).toBe(callsAfterFirst);

    jest.setSystemTime(new Date("2026-06-21T12:06:00Z"));
    await getMorningAttendanceHints("2026-06-21");
    expect((supabase.from as jest.Mock).mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
