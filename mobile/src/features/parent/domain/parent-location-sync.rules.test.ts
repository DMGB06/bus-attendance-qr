import { shouldPollParentBusLocations } from "@/src/features/parent/domain/parent-location-sync.rules";

describe("shouldPollParentBusLocations", () => {
  it("no hace poll cuando Realtime está SUBSCRIBED", () => {
    expect(shouldPollParentBusLocations("SUBSCRIBED", true)).toBe(false);
  });

  it("no hace poll en background aunque Realtime falló", () => {
    expect(shouldPollParentBusLocations("TIMED_OUT", false)).toBe(false);
  });

  it("hace poll en pantalla si Realtime falló o aún no conecta", () => {
    expect(shouldPollParentBusLocations("TIMED_OUT", true)).toBe(true);
    expect(shouldPollParentBusLocations("CLOSED", true)).toBe(true);
    expect(shouldPollParentBusLocations("CHANNEL_ERROR", true)).toBe(true);
    expect(shouldPollParentBusLocations(null, true)).toBe(true);
    expect(shouldPollParentBusLocations(undefined, true)).toBe(true);
  });
});
