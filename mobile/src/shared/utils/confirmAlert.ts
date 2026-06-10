import { Alert, Platform } from "react-native";

type ConfirmAlertOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function confirmAlert({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
}: ConfirmAlertOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      const prompt = `${title}\n\n${message}\n\nPulsa Aceptar para "${confirmLabel}" o Cancelar para "${cancelLabel}".`;
      return Promise.resolve(window.confirm(prompt));
    }
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}
