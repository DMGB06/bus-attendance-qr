import { z } from "zod";

export const ESTADOS = ["beneficiario", "baja", "sin_alta"] as const;
export type EstadoAlumno = (typeof ESTADOS)[number];
export const PAGE_SIZE = 20;

// Parámetros de la URL de la lista: cualquier valor raro cae al valor por defecto.
export const listaSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  estado: z.enum(ESTADOS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

// guid y no uuid: la base acepta cualquier uuid; z.uuid() de zod 4 exige versión RFC y rechaza ids válidos para Postgres.
export const altaSchema = z.object({ studentId: z.guid() });

export const bajaSchema = z.object({
  studentId: z.guid(),
  motivo: z.string().trim().min(1, "Escribe el motivo para continuar.").max(200, "El motivo no puede pasar de 200 caracteres."),
});
