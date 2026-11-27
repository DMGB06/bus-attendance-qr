import { z } from "zod";
import {
  PAGE_SIZE, TURNOS, diaLima, fechaHoraViaje, horaViaje, ultimosSieteDiasLima,
  type FilaAsistencia, type FilaViaje, type Parametros,
} from "./viajes";

export const FILTROS_EVENTO = {
  subio: "Subidas",
  manual: "Subidas manuales",
  bajo: "Bajadas",
  ausente: "Ausencias",
} as const;

const fecha = z.union([z.iso.date().refine((valor) => !valor.startsWith("0000-")), z.literal("")]).optional();
const paginaMaxima = Math.floor(2_147_483_647 / PAGE_SIZE) + 1;
const schema = z.object({
  vista: z.literal("asistencia").optional().catch(undefined),
  desde: fecha.catch(undefined),
  hasta: fecha.catch(undefined),
  turno: z.enum(Object.keys(TURNOS) as (keyof typeof TURNOS)[]).optional().catch(undefined),
  evento: z.enum(Object.keys(FILTROS_EVENTO) as (keyof typeof FILTROS_EVENTO)[]).optional().catch(undefined),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.int().min(1).max(paginaMaxima)).catch(1),
});

export type FiltrosAsistencia = Omit<z.infer<typeof schema>, "vista">;

export function filtrosAsistencia(parametros: Parametros, ahora = new Date()) {
  const { vista, ...filtros } = schema.parse(parametros);
  const sinFechas = parametros.desde === undefined && parametros.hasta === undefined;
  let error: string | undefined;
  if (sinFechas) {
    Object.assign(filtros, ultimosSieteDiasLima(ahora));
  } else if (!fecha.safeParse(parametros.desde).success || !fecha.safeParse(parametros.hasta).success) {
    error = "Ingresa fechas válidas.";
  } else if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    error = "La fecha inicial no puede ser posterior a la final.";
  }

  return { vista, filtros, error, filtrado: !sinFechas || !!(filtros.turno || filtros.evento) };
}

export function parametrosAsistencia(filtros?: FiltrosAsistencia) {
  const q = new URLSearchParams({ vista: "asistencia" });
  if (filtros) {
    q.set("desde", filtros.desde ?? "");
    q.set("hasta", filtros.hasta ?? "");
    if (filtros.turno) q.set("turno", filtros.turno);
    if (filtros.evento) q.set("evento", filtros.evento);
  }
  return q;
}

export function urlAsistencia(id: string, filtros?: FiltrosAsistencia) {
  const q = parametrosAsistencia(filtros);
  if (filtros && filtros.page > 1) q.set("page", String(filtros.page));
  return `/alumnos/${id}?${q}`;
}

export function horaRegistro(tripDate: string, scannedAt: string | null) {
  return scannedAt && diaLima(new Date(scannedAt)) !== tripDate ? fechaHoraViaje(scannedAt) : horaViaje(scannedAt);
}

export type FilaAsistenciaAlumno = Pick<FilaAsistencia, "id" | "event_type" | "scanned_at" | "voided_at" | "void_reason">
  & Pick<FilaViaje, "trip_date" | "turn_type" | "direction" | "bus_code" | "bus_label">
  & { trip_id: string };

export type HistorialAsistencia = {
  filas: FilaAsistenciaAlumno[];
  total: number;
  resumen: { subidas: number; ausencias: number };
};
