import {
  getPushSetupStatus,
  isPushAvailable,
} from "@/src/features/notifications/services/push-permissions.service";

const mockPlatform = { OS: "web" };
const mockConstants: { appOwnership: string | null; expoConfig: unknown } = {
  appOwnership: null,
  expoConfig: null,
};

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS;
    },
  },
}));
jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get appOwnership() {
      return mockConstants.appOwnership;
    },
    get expoConfig() {
      return mockConstants.expoConfig;
    },
  },
}));

const TECHNICAL_TEXT = /localhost|APK|eas |npx|projectId|app\.json|expo/i;

describe("isPushAvailable", () => {
  it("no esta disponible en el navegador, aunque cuente como dispositivo", () => {
    mockPlatform.OS = "web";

    expect(isPushAvailable()).toBe(false);
  });

  it("esta disponible en un celular", () => {
    mockPlatform.OS = "android";

    expect(isPushAvailable()).toBe(true);
  });
});

describe("getPushSetupStatus", () => {
  it("no muestra texto tecnico a los padres en el navegador", () => {
    mockPlatform.OS = "web";

    const status = getPushSetupStatus();

    expect(status.available).toBe(false);
    if (!status.available) {
      expect(`${status.reason} ${status.hint}`).not.toMatch(TECHNICAL_TEXT);
    }
  });

  it("no muestra texto tecnico si a la app instalada le falta configuracion", () => {
    mockPlatform.OS = "android";
    mockConstants.expoConfig = null;

    const status = getPushSetupStatus();

    expect(status.available).toBe(false);
    if (!status.available) {
      expect(`${status.reason} ${status.hint}`).not.toMatch(TECHNICAL_TEXT);
    }
  });
});
