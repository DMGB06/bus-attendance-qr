import { shouldPollParentBusLocations } from "@/src/features/parent/domain/parent-location-sync.rules";

describe("shouldPollParentBusLocations", () => {
  it("no hace poll cuando Realtime está SUBSCRIBED", () => {
    expect(shouldPollParentBusLocations("SUBSCRIBED")).toBe(false);
  });

  it("hace poll si Realtime falló o aún no conecta", () => {
    expect(shouldPollParentBusLocations("TIMED_OUT")).toBe(true);
    expect(shouldPollParentBusLocations("CLOSED")).toBe(true);
    expect(shouldPollParentBusLocations("CHANNEL_ERROR")).toBe(true);
    expect(shouldPollParentBusLocations(null)).toBe(true);
    expect(shouldPollParentBusLocations(undefined)).toBe(true);
  });
});
