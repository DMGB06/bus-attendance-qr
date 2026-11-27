import { z } from "zod";
import { urlIncidencias } from "./incidencias";
import { urlViajes } from "./viajes";

// Lo que devuelve buscontrol.admin_dashboard() (037). Si la base cambia de forma, la página falla en vez de mostrar números falsos.
const n = z.coerce.number().int().min(0);

export const resumenSchema = z.object({
  beneficiarios_activos: n,
  apoderados_activos: n,
  apoderados_con_cuenta: n,
  carnets: z.object({ vigente: n, vencido: n, perdido: n, sin_carnet: n }),
  con_apoderado: n,
  sin_apoderado: n,
  emitidos_mes: n,
  emitidos_mes_anterior: n,
  emitidos_por_mes: z.array(z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/), n })).length(6),
});

export type Resumen = z.infer<typeof resumenSchema>;

const fecha = z.iso.date().refine((valor) => !valor.startsWith("0000-"));
const conteo = z.number().int().nonnegative();
const diaOperativo = z.object({ fecha, en_curso: conteo, cerrados: conteo });

export const resumenOperativoSchema = diaOperativo.extend({
  subidas: conteo,
  ausencias: conteo,
  anulaciones: conteo,
  dias: z.array(diaOperativo).length(7),
}).superRefine((resumen, ctx) => {
  const hoy = resumen.dias.at(-1);
  if (hoy?.fecha !== resumen.fecha || hoy.en_curso !== resumen.en_curso || hoy.cerrados !== resumen.cerrados) {
    ctx.addIssue({ code: "custom", path: ["dias"], message: "El último día debe coincidir con el resumen de hoy." });
  }
  for (let i = 1; i < resumen.dias.length; i++) {
    const anterior = Date.parse(`${resumen.dias[i - 1].fecha}T00:00:00Z`);
    const siguiente = Date.parse(`${resumen.dias[i].fecha}T00:00:00Z`);
    if (siguiente - anterior !== 86_400_000) {
      ctx.addIssue({ code: "custom", path: ["dias", i, "fecha"], message: "Las fechas deben ser consecutivas." });
    }
  }
});

export type ResumenOperativo = z.infer<typeof resumenOperativoSchema>;

export function enlacesOperacion(resumen: ResumenOperativo) {
  const hoy = { desde: resumen.fecha, hasta: resumen.fecha, page: 1 };
  return {
    enCurso: urlViajes({ ...hoy, estado: "active" }),
    cerrados: urlViajes({ ...hoy, estado: "completed" }),
    subidas: urlViajes(hoy),
    incidencias: urlIncidencias(hoy),
    semana: urlViajes({ ...hoy, desde: resumen.dias[0].fecha }),
  };
}
