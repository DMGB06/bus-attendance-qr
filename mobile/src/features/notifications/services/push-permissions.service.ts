import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/** Push remoto no funciona en Expo Go (SDK 53+). Requiere development build o APK EAS. */
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export function isPushAvailable(): boolean {
  return Device.isDevice && !isExpoGo();
}

function getExpoProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return null;
  }

  if (projectId === "CONFIGURE-WITH-EAS-PROJECT-ID") {
    return null;
  }

  return projectId;
}

let notificationHandlerConfigured = false;

async function loadNotificationsModule() {
  if (!isPushAvailable()) {
    return null;
  }

  const Notifications = await import("expo-notifications");

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
}

async function ensureAndroidChannel(
  Notifications: Awaited<ReturnType<typeof loadNotificationsModule>>,
): Promise<void> {
  if (!Notifications || Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("bus-attendance", {
    name: "Bus Escolar",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#1C3284",
  });
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!isPushAvailable()) {
    return false;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return false;
  }

  await ensureAndroidChannel(Notifications);

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!isPushAvailable()) {
    return null;
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    console.warn(
      "[push] Falta extra.eas.projectId en app.json. Configura EAS para recibir push en producción.",
    );
    return null;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function getPushPlatformLabel(): string {
  return Platform.OS;
}
