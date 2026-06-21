import { NativeModules, UIManager, Platform } from "react-native";

/** WebView nativo disponible solo tras rebuild del dev client con react-native-webview. */
export function isNativeWebViewAvailable(): boolean {
  if (Platform.OS === "web") {
    return false;
  }

  if (UIManager.hasViewManagerConfig?.("RNCWebView")) {
    return true;
  }

  return Boolean(
    (NativeModules as { RNCWebViewModule?: { getConstants?: () => unknown } }).RNCWebViewModule,
  );
}
