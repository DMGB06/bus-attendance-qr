import { z } from "zod";

export const FILTROS = ["activo", "desactivado", "con_cuenta", "sin_cuenta"] as const;
export type FiltroApoderado = (typeof FILTROS)[number];
export const PAGE_SIZE = 20;
export const PARENTESCOS = ["apoderado", "madre", "padre", "abuelo o abuela", "tío o tía", "otro"] as const;

export const listaSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  filtro: z.enum(FILTROS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

// El formato (teléfono de 9 dígitos, DNI de 8, correo) lo valida la base de datos con mensajes en español:
// aquí solo se acotan los largos. guid y no uuid: Postgres acepta cualquier uuid.
const texto = (max: number) => z.string().trim().max(max).transform((v) => v || null);

export const apoderadoSchema = z.object({
  fullName: z.string().trim().min(1, "Escribe el nombre del apoderado.").max(150, "El nombre no puede pasar de 150 caracteres."),
  dni: texto(20),
  phone: texto(30),
  email: texto(150),
  notes: texto(500),
});

export const idSchema = z.guid();
export const vinculoSchema = z.object({ studentId: z.guid(), guardianId: z.guid() });
export const vincularSchema = vinculoSchema.extend({
  relationship: z.enum(PARENTESCOS),
  primary: z.boolean(),
});
