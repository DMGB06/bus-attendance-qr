import type { FilaAuditoria, Grupo } from "@/lib/schemas/auditoria";

export type Descripcion = {
  titulo: string;
  etiqueta: string;
  sobre: { texto: string; href?: string } | null;
  detalle: string | null;
};

export const ETIQUETA: Record<Grupo, string> = { alumnos: "Alumnos", apoderados: "Apoderados", cuentas: "Cuentas de padres", carnets: "Carnets", sesiones: "Sesiones" };

type Regla = { grupo: Grupo; titulo: string };
const REGLAS: Record<string, Regla> = {
  beneficiary_enroll: { grupo: "alumnos", titulo: "Dio de alta a un alumno" },
  beneficiary_deactivate: { grupo: "alumnos", titulo: "Dio de baja a un alumno" },
  beneficiary_reactivate: { grupo: "alumnos", titulo: "Reactivó a un alumno" },
  beneficiary_backfill: { grupo: "alumnos", titulo: "Cargó los alumnos iniciales" },
  guardian_create: { grupo: "apoderados", titulo: "Creó un apoderado" },
  guardian_update: { grupo: "apoderados", titulo: "Editó los datos de un apoderado" },
  guardian_activate: { grupo: "apoderados", titulo: "Reactivó a un apoderado" },
  guardian_deactivate: { grupo: "apoderados", titulo: "Desactivó a un apoderado" },
  guardian_link: { grupo: "apoderados", titulo: "Vinculó un alumno" },
  guardian_unlink: { grupo: "apoderados", titulo: "Desvinculó un alumno" },
  guardian_set_primary: { grupo: "apoderados", titulo: "Cambió el apoderado principal" },
  guardian_account_link: { grupo: "cuentas", titulo: "Creó una cuenta de padre" },
  guardian_account_unlink: { grupo: "cuentas", titulo: "Quitó la cuenta de un padre" },
  guardian_account_reset_password: { grupo: "cuentas", titulo: "Restableció la contraseña" },
  guardian_account_deactivate: { grupo: "cuentas", titulo: "Bloqueó el acceso a la app" },
  guardian_account_reactivate: { grupo: "cuentas", titulo: "Devolvió el acceso a la app" },
  qr_issue: { grupo: "carnets", titulo: "Emitió un carnet" },
  qr_report_lost: { grupo: "carnets", titulo: "Reportó un carnet perdido" },
  qr_print: { grupo: "carnets", titulo: "Imprimió carnets" },
  session_login: { grupo: "sesiones", titulo: "Inició sesión" },
  session_logout: { grupo: "sesiones", titulo: "Cerró sesión" },
};

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numero = (v: unknown) => (typeof v === "number" ? v : null);

// Traduce una fila del registro a lo que se muestra: qué se hizo, sobre quién y el detalle.
export function describir(f: FilaAuditoria): Descripcion {
  const regla = REGLAS[f.action];
  const titulo = regla?.titulo ?? f.action;
  const etiqueta = regla ? ETIQUETA[regla.grupo] : "Otros";
  const d = f.details ?? {};

  const alumno = f.student_id ? { texto: f.student_name ?? "Alumno eliminado", href: f.student_name ? (f.action.startsWith("qr_") ? `/qr/${f.student_id}` : `/alumnos/${f.student_id}`) : undefined } : null;
  const apoderado = f.guardian_id ? { texto: f.guardian_name ?? "Apoderado eliminado", href: f.guardian_name ? `/apoderados/${f.guardian_id}` : undefined } : null;

  switch (f.action) {
    case "beneficiary_backfill":
      return { titulo, etiqueta, sobre: null, detalle: `${numero(d.inserted) ?? 0} alumnos` };
    case "beneficiary_deactivate":
      return { titulo, etiqueta, sobre: alumno, detalle: texto(d.reason) && `"${texto(d.reason)}"` };
    case "guardian_link":
      return { titulo, etiqueta, sobre: apoderado, detalle: [alumno?.texto, d.is_primary ? "como principal" : null].filter(Boolean).join(", ") || null };
    case "guardian_unlink":
      return { titulo, etiqueta, sobre: apoderado, detalle: [alumno?.texto, d.was_primary ? "era el principal" : null].filter(Boolean).join(", ") || null };
    case "guardian_set_primary":
      return { titulo, etiqueta, sobre: apoderado, detalle: alumno?.texto ?? null };
    case "guardian_account_reset_password":
      return { titulo, etiqueta, sobre: apoderado, detalle: "La contraseña nueva no se guarda" };
    case "qr_issue":
      return { titulo, etiqueta, sobre: alumno, detalle: texto(d.code) && `Código ${texto(d.code)}` };
    case "qr_report_lost":
      return { titulo, etiqueta, sobre: alumno, detalle: texto(d.reason) && `"${texto(d.reason)}"` };
    case "qr_print": {
      const n = numero(d.count) ?? 0;
      return { titulo, etiqueta, sobre: { texto: `${n} ${n === 1 ? "alumno" : "alumnos"}` }, detalle: d.format === "png" ? "Imagen PNG" : "Hoja A4 en PDF" };
    }
    default:
      return { titulo, etiqueta, sobre: apoderado ?? alumno, detalle: null };
  }
}
