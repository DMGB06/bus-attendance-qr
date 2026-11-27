import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { horaRegistro } from "@/lib/schemas/asistencia";
import {
  TIPOS_INCIDENCIA, enlaceAsistenciaIncidencia, filtrosIncidencias, urlIncidencias, type FilaIncidencia,
} from "@/lib/schemas/incidencias";
import { EVENTOS, SENTIDOS, TURNOS, fechaViaje, nombreBus, type Parametros } from "@/lib/schemas/viajes";
import { listarBuses } from "../viajes/queries";
import { PaginacionViajes } from "../viajes/ui";
import { listarIncidencias } from "./queries";

function Alumno({ fila }: { fila: FilaIncidencia }) {
  const nombre = fila.student_name?.trim() || "Sin nombre registrado";
  return fila.student_id
    ? <Link className="ad-rowlink ad-viajes-texto" prefetch={false} href={enlaceAsistenciaIncidencia(fila.student_id, fila.trip_date)}>{nombre}</Link>
    : <span className="ad-viajes-texto">{nombre}</span>;
}

function Tipo({ tipo }: { tipo: FilaIncidencia["tipo"] }) {
  return <span className={`ad-tag ${tipo === "anulacion" ? "warn" : "neutral"}`}>{TIPOS_INCIDENCIA[tipo]}</span>;
}

function Detalle({ fila }: { fila: FilaIncidencia }) {
  if (fila.tipo === "ausencia") {
    return <p className="ad-note ad-viajes-texto">{fila.operator_name ? `Registró ${fila.operator_name}` : "Sin operador registrado"}</p>;
  }
  const registro = [
    fila.scanned_at ? horaRegistro(fila.trip_date, fila.scanned_at) : null,
    fila.operator_name,
  ].filter(Boolean).join(" · ");

  return (
    <div className="ad-stack tight ad-viajes-texto">
      <p className="ad-note">{EVENTOS[fila.event_type]} · {fila.void_reason || "Sin motivo registrado"}</p>
      <p className="ad-note">{fila.voided_by_name ? `Anuló ${fila.voided_by_name}` : "Sin responsable de anulación registrado"}</p>
      {registro && <p className="ad-note">Registro original · {registro}</p>}
    </div>
  );
}

export default async function Incidencias({ searchParams }: { searchParams: Promise<Parametros> }) {
  const { supabase } = await requireAdmin();
  const { filtros, error, fechasInvalidas, filtrado } = filtrosIncidencias(await searchParams);
  const [buses, listado] = await Promise.all([
    listarBuses(supabase).catch(() => null),
    error ? null : listarIncidencias(supabase, filtros),
  ]);
  const filas = listado?.filas.map((fila) => ({
    ...fila,
    fecha: fechaViaje(fila.trip_date),
    hora: horaRegistro(fila.trip_date, fila.incident_at),
    turno: fila.turn_type ? TURNOS[fila.turn_type] : "—",
    bus: nombreBus(fila.bus_code, fila.bus_label),
    sentido: SENTIDOS[fila.direction],
  })) ?? [];

  return (
    <div className="ad-stack ad-incidencias">
      <form key={urlIncidencias(filtros)} method="get" action="/incidencias" className="ad-filtros ad-viajes-filtros">
        {(["desde", "hasta"] as const).map((campo) => (
          <div className="ad-field" key={campo}>
            <label htmlFor={campo}>{campo === "desde" ? "Desde" : "Hasta"}</label>
            <input id={campo} name={campo} type="date" defaultValue={filtros[campo] ?? ""}
              aria-invalid={fechasInvalidas || undefined} aria-describedby={fechasInvalidas ? "incidencias-filtros-error" : undefined} />
          </div>
        ))}
        <div className="ad-field">
          <label htmlFor="bus">Bus</label>
          <select id="bus" name="bus" className="ad-input" defaultValue={filtros.bus ?? ""}>
            <option value="">Todos los buses</option>
            {buses?.map((bus) => <option key={bus.id} value={bus.id}>{nombreBus(bus.code, bus.label)}</option>)}
            {filtros.bus && !buses?.some((bus) => bus.id === filtros.bus) && <option value={filtros.bus}>Bus no disponible</option>}
          </select>
        </div>
        {([
          ["turno", "Turno", "Todos los turnos", TURNOS],
          ["tipo", "Tipo de incidencia", "Todos los tipos", TIPOS_INCIDENCIA],
        ] as const).map(([campo, label, opcion, valores]) => (
          <div className="ad-field" key={campo}>
            <label htmlFor={campo}>{label}</label>
            <select id={campo} name={campo} className="ad-input" defaultValue={filtros[campo] ?? ""}>
              <option value="">{opcion}</option>
              {Object.entries(valores).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
            </select>
          </div>
        ))}
        <button type="submit" className="ad-btn primary">Filtrar</button>
        {filtrado && <Link className="ad-link" href="/incidencias" prefetch={false}>Quitar filtros</Link>}
      </form>

      {error && <p id="incidencias-filtros-error" className="ad-error" role="alert">{error}</p>}
      {!error && !listado && <p className="ad-error" role="alert">No se pudieron cargar las incidencias. Vuelve a pulsar Filtrar para reintentar.</p>}
      {listado && !buses && <p className="ad-error" role="alert">No se pudo cargar la lista de buses. Vuelve a pulsar Filtrar para reintentar.</p>}
      {listado?.total === 0 && (
        <div className="ad-empty" role="status">
          {filtrado ? "No hay incidencias con esos filtros." : "No hay incidencias en los últimos siete días."}
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div className="ad-card ad-tablewrap">
            <table className="ad-tbl wide">
              <caption className="ad-sr">Registros de incidencias, ordenados por fecha del viaje y hora de la incidencia</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha del viaje</th><th scope="col">Hora de la incidencia</th><th scope="col">Alumno</th>
                  <th scope="col">Viaje</th><th scope="col">Incidencia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="ad-num"><Link className="ad-rowlink ad-nowrap" prefetch={false} href={`/viajes/${fila.trip_id}`} aria-label={`Ver viaje: ${fila.fecha}, ${fila.sentido}, ${fila.bus}`}>{fila.fecha}</Link></td>
                    <td className="ad-num">{fila.hora}</td>
                    <td><Alumno fila={fila} /></td>
                    <td className="ad-viajes-texto ad-incidencias-viaje">{fila.bus}<p className="ad-note">{fila.turno} · {fila.sentido}</p></td>
                    <td><div className="ad-stack tight"><Tipo tipo={fila.tipo} /><Detalle fila={fila} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="ad-cards" aria-label="Registros de incidencias">
            {filas.map((fila) => (
              <li key={fila.id} className="ad-card ad-movimiento">
                <div className="ad-movimiento-top">
                  <Link className="ad-rowlink" prefetch={false} href={`/viajes/${fila.trip_id}`} aria-label={`Ver viaje: ${fila.fecha}, ${fila.sentido}, ${fila.bus}`}>{fila.fecha} · {fila.sentido}</Link>
                  <Tipo tipo={fila.tipo} />
                </div>
                <Alumno fila={fila} />
                <dl className="ad-dl two">
                  <div><dt>Hora de la incidencia</dt><dd className="ad-num">{fila.hora}</dd></div>
                  <div><dt>Bus</dt><dd>{fila.bus}</dd></div>
                  <div><dt>Turno</dt><dd>{fila.turno}</dd></div>
                </dl>
                <Detalle fila={fila} />
              </li>
            ))}
          </ul>
        </>
      )}
      {listado && (
        <PaginacionViajes pagina={filtros.page} total={listado.total}
          enlace={(page) => urlIncidencias({ ...filtros, page })} singular="incidencia" plural="incidencias" />
      )}
    </div>
  );
}
