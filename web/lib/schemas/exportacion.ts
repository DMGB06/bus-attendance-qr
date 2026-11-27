import { filtrosAsistencia, parametrosAsistencia, type FiltrosAsistencia } from "./asistencia";
import { filtrosViajes, parametrosViajes, viajeId, type FiltrosViajes } from "./viajes";

export type OrigenCsv = "viajes" | "viaje" | "alumno";

export const urlExportarViajes = (filtros: FiltrosViajes) => `/viajes/exportar?${parametrosViajes(filtros)}`;
export const urlExportarViaje = (id: string) => `/viajes/${id}/exportar`;
export const urlExportarAlumno = (id: string, filtros: FiltrosAsistencia) => `/alumnos/${id}/asistencia/exportar?${parametrosAsistencia(filtros)}`;

const camposViajes = ["desde", "hasta", "bus", "turno", "sentido", "estado"] as const;
const camposAlumno = ["desde", "hasta", "turno", "evento"] as const;

export function parametrosExportacion(origen: OrigenCsv, query: URLSearchParams, id?: string) {
  if (origen === "viaje") return viajeId.safeParse(id).success ? { p_origen: origen, p_id: id } : null;
  if (origen === "alumno" && !viajeId.safeParse(id).success) return null;

  const campos = origen === "viajes" ? camposViajes : camposAlumno;
  if (campos.some((campo) => query.getAll(campo).length > 1)) return null;
  const parametros = Object.fromEntries(query);
  if (origen === "viajes") {
    const { filtros: f, error } = filtrosViajes(parametros);
    if (error || camposViajes.some((campo) => parametros[campo] && parametros[campo] !== f[campo])) return null;
    return {
      p_origen: origen, p_desde: f.desde || null, p_hasta: f.hasta || null, p_bus_id: f.bus ?? null,
      p_turno: f.turno ?? null, p_sentido: f.sentido ?? null, p_estado: f.estado ?? null,
    };
  }
  const { filtros: f, error } = filtrosAsistencia(parametros);
  if (error || camposAlumno.some((campo) => parametros[campo] && parametros[campo] !== f[campo])) return null;
  return { p_origen: origen, p_id: id, p_desde: f.desde || null, p_hasta: f.hasta || null, p_turno: f.turno ?? null, p_evento: f.evento ?? null };
}
