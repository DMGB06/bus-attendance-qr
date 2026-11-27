import { z } from "zod";

export const TURNOS = {
  mañana: "Recojo mañana",
  tarde: "Tarde",
  tarde_primaria: "Tarde primaria",
  tarde_secundaria: "Tarde secundaria",
  tarde_unica: "Tarde única",
} as const;
export const SENTIDOS = { recojo: "Recojo", retorno: "Retorno" } as const;
export const ESTADOS = { active: "En curso", completed: "Cerrado" } as const;
export const EVENTOS = { subio: "Subió", manual: "Subida manual", bajo: "Bajó", ausente: "Ausente" } as const;

export const PAGE_SIZE = 20;
const pagina = z.coerce.number().int().min(1).max(10000).catch(1);
export const viajeId = z.guid();
const fecha = z.union([z.iso.date().refine((valor) => !valor.startsWith("0000-")), z.literal("")]).optional().catch(undefined);
const claves = <T extends string>(opciones: Record<T, string>) => Object.keys(opciones) as T[];
const filtrosSchema = z.object({
  desde: fecha,
  hasta: fecha,
  bus: viajeId.optional().catch(undefined),
  turno: z.enum(claves(TURNOS)).optional().catch(undefined),
  sentido: z.enum(claves(SENTIDOS)).optional().catch(undefined),
  estado: z.enum(claves(ESTADOS)).optional().catch(undefined),
  page: pagina,
});

export type FiltrosViajes = z.infer<typeof filtrosSchema>;
export type Parametros = Record<string, string | string[] | undefined>;

const diaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", dateStyle: "short" });
const diaVisible = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const horaVisible = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fechaHoraVisible = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const uno = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

export const diaLima = (instante: Date) => diaIso.format(instante);

export function ultimosSieteDiasLima(ahora: Date) {
  return { desde: diaLima(new Date(ahora.getTime() - 6 * 86_400_000)), hasta: diaLima(ahora) };
}

export function filtrosViajes(sp: Parametros, ahora = new Date()) {
  const desde = uno(sp.desde);
  const hasta = uno(sp.hasta);
  const f = filtrosSchema.parse({
    desde,
    hasta,
    bus: uno(sp.bus),
    turno: uno(sp.turno),
    sentido: uno(sp.sentido),
    estado: uno(sp.estado),
    page: uno(sp.page),
  });
  const sinFechas = desde === undefined && hasta === undefined;
  if (sinFechas) {
    Object.assign(f, ultimosSieteDiasLima(ahora));
  }

  let error: string | undefined;
  if ((desde && !f.desde) || (hasta && !f.hasta)) error = "Ingresa fechas válidas.";
  else if (f.desde && f.hasta && f.desde > f.hasta) error = "La fecha inicial no puede ser posterior a la final.";

  return {
    filtros: f,
    error,
    filtrado: !sinFechas || !!(f.bus || f.turno || f.sentido || f.estado),
  };
}

export function paginaEventos(sp: Parametros) {
  return pagina.parse(uno(sp.eventos));
}

export function parametrosViajes(f: FiltrosViajes) {
  const q = new URLSearchParams();
  q.set("desde", f.desde ?? "");
  q.set("hasta", f.hasta ?? "");
  if (f.bus) q.set("bus", f.bus);
  if (f.turno) q.set("turno", f.turno);
  if (f.sentido) q.set("sentido", f.sentido);
  if (f.estado) q.set("estado", f.estado);
  return q;
}

export function urlViajes(f: FiltrosViajes, id?: string, eventos = 1) {
  const q = parametrosViajes(f);
  if (f.page > 1) q.set("page", String(f.page));
  if (id && eventos > 1) q.set("eventos", String(eventos));
  return `/viajes${id ? `/${id}` : ""}?${q.toString()}`;
}

export const fechaViaje = (dia: string) => diaVisible.format(new Date(`${dia}T00:00:00Z`));
export const horaViaje = (valor: string | null) => valor ? horaVisible.format(new Date(valor)) : "—";
export const fechaHoraViaje = (valor: string | null) => valor ? fechaHoraVisible.format(new Date(valor)) : "—";

export function nombreBus(codigo: string | null, nombre: string | null) {
  return codigo && nombre && codigo !== nombre ? `${codigo} · ${nombre}` : codigo || nombre || "—";
}

export type FilaViaje = {
  id: string;
  trip_date: string;
  turn_type: keyof typeof TURNOS | null;
  direction: keyof typeof SENTIDOS;
  status: keyof typeof ESTADOS;
  started_at: string | null;
  ended_at: string | null;
  bus_code: string | null;
  bus_label: string | null;
};

export type BusViaje = { id: string; code: string; label: string };
export type FilaAsistencia = {
  id: string;
  student_id: string;
  student_name: string | null;
  event_type: keyof typeof EVENTOS;
  scanned_at: string | null;
  operator_name: string | null;
  voided_at: string | null;
  void_reason: string | null;
};
export type DetalleViaje = {
  viaje: FilaViaje;
  resumen: { subidas: number; bajadas: number; ausencias: number; pendientes: number };
  total: number;
  filas: FilaAsistencia[];
};
