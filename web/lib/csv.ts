import { horaRegistro } from "./schemas/asistencia";
import { diaLima, ESTADOS, EVENTOS, fechaHoraViaje, fechaViaje, horaViaje, nombreBus, SENTIDOS, TURNOS, type FilaViaje } from "./schemas/viajes";
import type { OrigenCsv } from "./schemas/exportacion";

export type FilaCsv = Omit<FilaViaje, "id" | "status"> & {
  status: FilaViaje["status"] | null;
  event_type: keyof typeof EVENTOS | null;
  scanned_at: string | null;
  anulado: boolean;
  void_reason: string | null;
  student_name: string | null;
  operator_name: string | null;
};

const columnasViajes = ["Fecha", "Bus", "Turno", "Sentido", "Estado", "Inicio", "Cierre"];
const columnasEvento = ["Fecha del viaje", "Bus", "Turno", "Sentido", "Alumno", "Evento", "Hora registrada"];
const columnasAnulacion = ["Estado de anulación", "Motivo de anulación"];

function celda(valor: string | null) {
  const texto = valor ?? "";
  const neutralizado = /^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]|^[\p{Zs}\p{Cf}]*\p{Cc}/u.test(texto) ? "'" + texto : texto;
  return '"' + neutralizado.replaceAll('"', '""') + '"';
}

export function generarCsv(origen: OrigenCsv, filas: FilaCsv[]) {
  const columnas = origen === "viajes"
    ? columnasViajes
    : [...columnasEvento, ...(origen === "viaje" ? ["Operador"] : []), ...columnasAnulacion];
  const lineas = [columnas.map(celda).join(";")];
  for (const fila of filas) {
    const viaje = [
      fechaViaje(fila.trip_date), fila.bus_code || fila.bus_label ? nombreBus(fila.bus_code, fila.bus_label) : "",
      fila.turn_type ? TURNOS[fila.turn_type] : "", SENTIDOS[fila.direction],
    ];
    const valores = origen === "viajes" ? [
      ...viaje, fila.status ? ESTADOS[fila.status] : "",
      fila.started_at ? horaViaje(fila.started_at) : "", fila.ended_at ? horaViaje(fila.ended_at) : "",
    ] : [
      ...viaje, fila.student_name, fila.event_type ? EVENTOS[fila.event_type] : "",
      fila.scanned_at ? (origen === "viaje" ? fechaHoraViaje(fila.scanned_at) : horaRegistro(fila.trip_date, fila.scanned_at)) : "",
      ...(origen === "viaje" ? [fila.operator_name] : []), fila.anulado ? "Anulado" : "Vigente", fila.void_reason,
    ];
    lineas.push(valores.map(celda).join(";"));
  }
  return "\uFEFF" + lineas.join("\r\n") + "\r\n";
}

export function nombreCsv(origen: OrigenCsv, ahora = new Date()) {
  const nombre = { viajes: "viajes", viaje: "asistencia-viaje", alumno: "asistencia-alumno" }[origen];
  return `${nombre}-${diaLima(ahora)}.csv`;
}
