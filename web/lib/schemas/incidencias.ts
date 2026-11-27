import { z } from "zod";
import { urlAsistencia } from "./asistencia";
import {
  EVENTOS, PAGE_SIZE, TURNOS, ultimosSieteDiasLima, viajeId, type FilaViaje, type Parametros,
} from "./viajes";

export const TIPOS_INCIDENCIA = { ausencia: "Ausencia registrada", anulacion: "Evento anulado" } as const;

const fecha = z.union([z.iso.date().refine((valor) => !valor.startsWith("0000-")), z.literal("")]);
const paginaMaxima = Math.floor(2_147_483_647 / PAGE_SIZE) + 1;
const schema = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  bus: z.union([viajeId, z.literal("")]).optional(),
  turno: z.enum(Object.keys(TURNOS) as (keyof typeof TURNOS)[]).or(z.literal("")).optional(),
  tipo: z.enum(Object.keys(TIPOS_INCIDENCIA) as (keyof typeof TIPOS_INCIDENCIA)[]).or(z.literal("")).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.int().min(1).max(paginaMaxima)).catch(1),
});

export type FiltrosIncidencias = z.infer<typeof schema>;

export function filtrosIncidencias(sp: Parametros, ahora = new Date()) {
  const resultado = schema.safeParse(sp);
  const invalidos = new Set(resultado.error?.issues.map(({ path }) => path[0]));
  const filtros = resultado.success
    ? resultado.data
    : schema.parse(Object.fromEntries(Object.entries(sp).filter(([campo]) => !invalidos.has(campo))));
  const sinFechas = sp.desde === undefined && sp.hasta === undefined;
  if (sinFechas) Object.assign(filtros, ultimosSieteDiasLima(ahora));
  const rangoInvertido = !!filtros.desde && !!filtros.hasta && filtros.desde > filtros.hasta;
  const fechaInvalida = invalidos.has("desde") || invalidos.has("hasta");
  let error: string | undefined;
  if (fechaInvalida) error = "Ingresa fechas válidas.";
  else if (rangoInvertido) error = "La fecha inicial no puede ser posterior a la final.";
  else if (invalidos.size > 0) error = "Revisa los filtros de incidencias.";
  return {
    filtros, error, fechasInvalidas: fechaInvalida || rangoInvertido,
    filtrado: !!error || !sinFechas || !!(filtros.bus || filtros.turno || filtros.tipo),
  };
}

export function urlIncidencias(filtros: FiltrosIncidencias) {
  const q = new URLSearchParams({ desde: filtros.desde ?? "", hasta: filtros.hasta ?? "" });
  if (filtros.bus) q.set("bus", filtros.bus);
  if (filtros.turno) q.set("turno", filtros.turno);
  if (filtros.tipo) q.set("tipo", filtros.tipo);
  if (filtros.page > 1) q.set("page", String(filtros.page));
  return `/incidencias?${q}`;
}

export function enlaceAsistenciaIncidencia(id: string, tripDate: string) {
  return urlAsistencia(id, { desde: tripDate, hasta: tripDate, page: 1 });
}

export type FilaIncidencia = Pick<FilaViaje, "id" | "trip_date" | "turn_type" | "direction" | "bus_code" | "bus_label"> & {
  trip_id: string;
  student_id: string | null;
  student_name: string | null;
  tipo: keyof typeof TIPOS_INCIDENCIA;
  event_type: keyof typeof EVENTOS;
  incident_at: string | null;
  scanned_at: string | null;
  operator_name: string | null;
  voided_by_name: string | null;
  void_reason: string | null;
};
