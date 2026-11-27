import Link from "next/link";
import {
  FILTROS_EVENTO, horaRegistro, urlAsistencia,
  type FilaAsistenciaAlumno, type FiltrosAsistencia, type HistorialAsistencia,
} from "@/lib/schemas/asistencia";
import { urlExportarAlumno } from "@/lib/schemas/exportacion";
import { EVENTOS, SENTIDOS, TURNOS, fechaViaje, nombreBus } from "@/lib/schemas/viajes";
import { BotonExportar } from "../../boton-exportar";
import { PaginacionViajes } from "../../viajes/ui";

function Evento({ fila }: { fila: FilaAsistenciaAlumno }) {
  return (
    <>
      <div className="ad-tags">
        <span className="ad-tag neutral">{EVENTOS[fila.event_type]}</span>
        {fila.voided_at && <span className="ad-tag warn">Anulado</span>}
      </div>
      {fila.void_reason && <p className="ad-note ad-asistencia-motivo">Motivo de anulación: {fila.void_reason}</p>}
    </>
  );
}

export function AsistenciaAlumno({ id, filtros, filtrado, error, historial }: {
  id: string;
  filtros: FiltrosAsistencia;
  filtrado: boolean;
  error?: string;
  historial: HistorialAsistencia | null;
}) {
  const exportar = urlExportarAlumno(id, filtros);
  const filas = historial?.filas.map((fila) => ({
    ...fila,
    fecha: fechaViaje(fila.trip_date),
    hora: horaRegistro(fila.trip_date, fila.scanned_at),
    turno: fila.turn_type ? TURNOS[fila.turn_type] : "—",
    bus: nombreBus(fila.bus_code, fila.bus_label),
    sentido: SENTIDOS[fila.direction],
  })) ?? [];

  return (
    <section className="ad-stack" aria-labelledby="historial-asistencia">
      <h2 id="historial-asistencia" className="ad-h2">Historial de asistencia</h2>
      <form key={urlAsistencia(id, filtros)} method="get" action={`/alumnos/${id}`} className="ad-filtros ad-asistencia-filtros">
        <input type="hidden" name="vista" value="asistencia" />
        {(["desde", "hasta"] as const).map((campo) => (
          <div className="ad-field" key={campo}>
            <label htmlFor={campo}>{campo === "desde" ? "Desde" : "Hasta"}</label>
            <input id={campo} name={campo} type="date" defaultValue={filtros[campo] ?? ""}
              aria-invalid={error ? true : undefined} aria-describedby={error ? "asistencia-fechas-error" : undefined} />
          </div>
        ))}
        {([
          ["turno", "Turno", "Todos los turnos", TURNOS],
          ["evento", "Evento", "Todos los eventos", FILTROS_EVENTO],
        ] as const).map(([campo, label, opcion, valores]) => (
          <div className="ad-field" key={campo}>
            <label htmlFor={campo}>{label}</label>
            <select id={campo} name={campo} className="ad-input" defaultValue={filtros[campo] ?? ""}>
              <option value="">{opcion}</option>
              {Object.entries(valores).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </div>
        ))}
        <button type="submit" className="ad-btn primary">Filtrar</button>
        {filtrado && <Link className="ad-link" href={urlAsistencia(id)} prefetch={false}>Quitar filtros</Link>}
      </form>

      <BotonExportar key={exportar} endpoint={exportar} deshabilitado={!!error} />
      {error && <p id="asistencia-fechas-error" className="ad-error" role="alert">{error}</p>}
      {!error && !historial && (
        <p className="ad-error" role="alert">No se pudo cargar el historial de asistencia. Vuelve a pulsar Filtrar para reintentar.</p>
      )}
      {historial && (
        <>
          <section className="ad-card ad-pad" aria-labelledby="asistencia-resumen">
            <h3 id="asistencia-resumen" className="ad-h2">Resumen de asistencia</h3>
            <dl className="ad-dl">
              <div><dt>Viajes con subida registrada</dt><dd className="ad-num">{historial.resumen.subidas}</dd></div>
              <div><dt>Viajes con ausencia registrada</dt><dd className="ad-num">{historial.resumen.ausencias}</dd></div>
            </dl>
          </section>
          {historial.total === 0 && (
            <div className="ad-empty" role="status">
              {filtrado ? "No hay registros de asistencia con esos filtros." : "No hay registros de asistencia en los últimos siete días."}
            </div>
          )}
          {filas.length > 0 && (
            <>
              <div className="ad-card ad-tablewrap">
                <table className="ad-tbl">
                  <caption className="ad-sr">Historial de asistencia, del viaje más reciente al más antiguo</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha del viaje</th><th scope="col">Hora registrada</th><th scope="col">Bus</th>
                      <th scope="col">Turno</th><th scope="col">Sentido</th><th scope="col">Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => (
                      <tr key={fila.id}>
                        <td className="ad-num">
                          <Link className="ad-rowlink ad-nowrap" prefetch={false} href={`/viajes/${fila.trip_id}`}
                            aria-label={`Ver viaje: ${fila.fecha}, ${fila.sentido}, ${fila.bus}`}>{fila.fecha}</Link>
                        </td>
                        <td className="ad-num">{fila.hora}</td>
                        <td className="ad-viajes-texto">{fila.bus}</td><td>{fila.turno}</td><td>{fila.sentido}</td>
                        <td><Evento fila={fila} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="ad-cards">
                {filas.map((fila) => (
                  <li key={fila.id} className="ad-card ad-movimiento">
                    <Link className="ad-rowlink" prefetch={false} href={`/viajes/${fila.trip_id}`}
                      aria-label={`Ver viaje: ${fila.fecha}, ${fila.sentido}, ${fila.bus}`}>{fila.fecha} · {fila.sentido}</Link>
                    <Evento fila={fila} />
                    <dl className="ad-dl two">
                      <div><dt>Hora registrada</dt><dd className="ad-num">{fila.hora}</dd></div>
                      <div><dt>Bus</dt><dd>{fila.bus}</dd></div>
                      <div><dt>Turno</dt><dd>{fila.turno}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
          <PaginacionViajes pagina={filtros.page} total={historial.total}
            enlace={(page) => urlAsistencia(id, { ...filtros, page })} singular="registro" plural="registros" />
        </>
      )}
    </section>
  );
}
