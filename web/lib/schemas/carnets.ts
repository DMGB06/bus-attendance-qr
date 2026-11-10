import { z } from "zod";
import { MAX_CARNETS } from "@/lib/carnet/layout";

export const FILTROS = ["vigente", "por_emitir", "vencido", "perdido"] as const;
export type FiltroCarnet = (typeof FILTROS)[number];
export type EstadoCarnetFila = "vigente" | "vencido" | "perdido" | "sin_carnet";
export const PAGE_SIZE = 20;

export const listaSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  filtro: z.enum(FILTROS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

// guid y no uuid: Postgres acepta cualquier uuid; z.uuid() de zod 4 exige versión RFC.
export const idSchema = z.guid();
export const idsSchema = z.array(z.guid()).min(1, "Elige al menos un alumno.").max(MAX_CARNETS, `Elige hasta ${MAX_CARNETS} alumnos.`);
export const formatoSchema = z.enum(["pdf", "png"]);
export const motivoSchema = z.string().trim().min(1, "Escribe qué pasó con el carnet.").max(200, "El motivo no puede pasar de 200 caracteres.");
