import { describe, expect, it } from "vitest";
import type { FilaAuditoria } from "@/lib/schemas/auditoria";
import { describir } from "./describir";

const fila = (p: Partial<FilaAuditoria>): FilaAuditoria => ({
  id: "x", created_at: "2026-11-09T21:00:00Z", action: "x", actor_email: "a@b.pe",
  student_id: null, student_name: null, guardian_id: null, guardian_name: null, details: {}, total: 1, ...p,
});

describe("describir", () => {
  it("baja: alumno enlazado a su ficha y motivo entre comillas", () => {
    const d = describir(fila({ action: "beneficiary_deactivate", student_id: "s1", student_name: "ANA", details: { reason: "se mudo" } }));
    expect(d).toMatchObject({ titulo: "Dio de baja a un alumno", etiqueta: "Alumnos", sobre: { texto: "ANA", href: "/alumnos/s1" }, detalle: '"se mudo"' });
  });

  it("carnet: el alumno enlaza al carnet, no a la ficha", () => {
    const d = describir(fila({ action: "qr_issue", student_id: "s1", student_name: "ANA", details: { code: "BU0098" } }));
    expect(d.sobre?.href).toBe("/qr/s1");
    expect(d.detalle).toBe("Código BU0098");
  });

  it("vínculo: sobre el apoderado, el alumno en el detalle", () => {
    const d = describir(fila({ action: "guardian_link", guardian_id: "g1", guardian_name: "ROSA", student_id: "s1", student_name: "ANA", details: { is_primary: true } }));
    expect(d.sobre).toEqual({ texto: "ROSA", href: "/apoderados/g1" });
    expect(d.detalle).toBe("ANA, como principal");
  });

  it("impresión: cantidad en singular y plural y formato", () => {
    expect(describir(fila({ action: "qr_print", details: { count: 1, format: "png" } }))).toMatchObject({ sobre: { texto: "1 alumno" }, detalle: "Imagen PNG" });
    expect(describir(fila({ action: "qr_print", details: { count: 3, format: "pdf" } }))).toMatchObject({ sobre: { texto: "3 alumnos" }, detalle: "Hoja A4 en PDF" });
  });

  it("contraseña: nunca muestra la contraseña", () => {
    expect(describir(fila({ action: "guardian_account_reset_password", guardian_id: "g1", guardian_name: "ROSA" })).detalle).toBe("La contraseña nueva no se guarda");
  });

  it("alumno borrado: dice 'Alumno eliminado' y no enlaza", () => {
    const d = describir(fila({ action: "qr_report_lost", student_id: "s9", student_name: null, details: { reason: "x" } }));
    expect(d.sobre).toEqual({ texto: "Alumno eliminado", href: undefined });
  });

  it("acción desconocida: muestra el nombre técnico en vez de fallar", () => {
    expect(describir(fila({ action: "algo_nuevo" }))).toMatchObject({ titulo: "algo_nuevo", etiqueta: "Otros", sobre: null, detalle: null });
  });
});
