import { supabase } from "@/src/core/config/supabase";
import { registerAttendance } from "@/src/features/trips/services/attendance.service";

jest.mock("@/src/core/config/supabase", () => ({
  supabase: { rpc: jest.fn() },
  supabasePublic: {},
}));

describe("registerAttendance", () => {
  it("con la red colgada falla pronto para poder encolar", async () => {
    jest.useFakeTimers();
    (supabase.rpc as jest.Mock).mockReturnValue(new Promise(() => undefined));

    const assertion = expect(registerAttendance("t1", "s1", "subio")).rejects.toThrow("timeout");
    await jest.advanceTimersByTimeAsync(8_000);

    await assertion;
    jest.useRealTimers();
  });
});
