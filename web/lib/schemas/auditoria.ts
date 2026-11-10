import { z } from "zod";

export const GRUPOS = ["alumnos", "apoderados", "cuentas", "carnets", "sesiones"] as const;
export type Grupo = (typeof GRUPOS)[number];
export const PAGE_SIZE = 20;

// Parámetros de la URL: cualquier valor raro cae al valor por defecto (fecha vacía = sin límite).
export const listaSchema = z.object({
  desde: z.iso.date().optional().catch(undefined),
  hasta: z.iso.date().optional().catch(undefined),
  grupo: z.enum(GRUPOS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

export type FilaAuditoria = {
  id: string;
  created_at: string;
  action: string;
  actor_email: string | null;
  student_id: string | null;
  student_name: string | null;
  guardian_id: string | null;
  guardian_name: string | null;
  details: Record<string, unknown>;
  total: number;
};
