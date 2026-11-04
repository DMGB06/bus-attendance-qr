import { getCameraPermissionPrompt } from "@/src/features/trips/domain/camera-permission-prompt";

describe("getCameraPermissionPrompt", () => {
  it("pide el permiso si aun se puede preguntar", () => {
    const prompt = getCameraPermissionPrompt({ status: "undetermined", canAskAgain: true }, false);

    expect(prompt.action).toBe("request");
    expect(prompt.actionLabel).toBe("Permitir cámara");
  });

  it("lleva a los ajustes si el telefono ya no permite preguntar", () => {
    const prompt = getCameraPermissionPrompt({ status: "denied", canAskAgain: false }, false);

    expect(prompt.action).toBe("settings");
    expect(prompt.actionLabel).toBe("Abrir ajustes");
  });

  it("en el navegador explica como desbloquear, porque volver a pedir no muestra nada", () => {
    const prompt = getCameraPermissionPrompt({ status: "denied", canAskAgain: true }, true);

    expect(prompt.action).toBe("request");
    expect(prompt.actionLabel).toBe("Reintentar");
    expect(prompt.body).toMatch(/navegador/);
  });

  it("en el navegador pide el permiso normal si aun no se ha decidido", () => {
    const prompt = getCameraPermissionPrompt({ status: "undetermined", canAskAgain: true }, true);

    expect(prompt.actionLabel).toBe("Permitir cámara");
  });
});
