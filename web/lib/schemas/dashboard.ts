import { z } from "zod";

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
