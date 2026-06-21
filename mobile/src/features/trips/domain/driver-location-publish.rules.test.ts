import {
  isOperationalOpsTab,
  shouldPublishDriverLocation,
} from "@/src/features/trips/domain/driver-location-publish.rules";

describe("isOperationalOpsTab", () => {
  it("acepta trip, scanner y roster", () => {
    expect(isOperationalOpsTab("trip")).toBe(true);
    expect(isOperationalOpsTab("scanner")).toBe(true);
    expect(isOperationalOpsTab("roster")).toBe(true);
  });

  it("rechaza historial, cerrar viaje y perfil", () => {
    expect(isOperationalOpsTab("activity")).toBe(false);
    expect(isOperationalOpsTab("close-trip")).toBe(false);
    expect(isOperationalOpsTab("profile")).toBe(false);
    expect(isOperationalOpsTab(undefined)).toBe(false);
  });
});

describe("shouldPublishDriverLocation", () => {
  const base = {
    isDriver: true,
    tripActive: true,
    appState: "active" as const,
    opsTabName: "scanner" as const,
  };

  it("publica en escáner con viaje activo y app en primer plano", () => {
    expect(shouldPublishDriverLocation(base)).toBe(true);
  });

  it("no publica si no es chofer", () => {
    expect(shouldPublishDriverLocation({ ...base, isDriver: false })).toBe(false);
  });

  it("no publica sin viaje activo", () => {
    expect(shouldPublishDriverLocation({ ...base, tripActive: false })).toBe(false);
  });

  it("no publica en background", () => {
    expect(shouldPublishDriverLocation({ ...base, appState: "background" })).toBe(false);
  });

  it("no publica en historial", () => {
    expect(shouldPublishDriverLocation({ ...base, opsTabName: "activity" })).toBe(false);
  });
});
