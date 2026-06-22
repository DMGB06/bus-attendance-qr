import {
  buildAttendancePushNotification,
  resolvePushEventKey,
} from "@/src/features/notifications/domain/notification-templates";

describe("testS · plantillas push", () => {
  it("resuelve event_key recojo subió", () => {
    expect(resolvePushEventKey("subio", "recojo")).toBe("recojo_subio");
    expect(resolvePushEventKey("manual", "recojo")).toBe("recojo_subio");
  });

  it("resuelve event_key retorno bajó", () => {
    expect(resolvePushEventKey("bajo", "retorno")).toBe("retorno_bajo");
  });

  it("no notifica ausente", () => {
    expect(resolvePushEventKey("ausente", "recojo")).toBeNull();
  });

  it("arma mensaje legible para apoderado", () => {
    const msg = buildAttendancePushNotification("recojo_subio", "Alumno Demo");
    expect(msg.title).toBe("CerroBus");
    expect(msg.body).toContain("Alumno Demo");
    expect(msg.body).toContain("subió");
  });
});
