export type CameraPermissionPrompt = {
  body: string;
  actionLabel: string;
  action: "request" | "settings";
};

export function getCameraPermissionPrompt(
  permission: { status: string; canAskAgain: boolean },
  isWeb: boolean,
): CameraPermissionPrompt {
  if (!permission.canAskAgain) {
    return {
      body: "El acceso a la cámara está bloqueado. Actívalo en los ajustes del teléfono.",
      actionLabel: "Abrir ajustes",
      action: "settings",
    };
  }

  // El navegador siempre dice que se puede volver a preguntar, pero si esta bloqueado no muestra nada.
  if (isWeb && permission.status === "denied") {
    return {
      body: "El navegador bloqueó la cámara. Actívala desde el ícono junto a la dirección de la página y pulsa Reintentar.",
      actionLabel: "Reintentar",
      action: "request",
    };
  }

  return {
    body: "Necesitas permitir el acceso a la cámara para usar el escáner.",
    actionLabel: "Permitir cámara",
    action: "request",
  };
}
