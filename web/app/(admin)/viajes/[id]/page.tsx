import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { urlExportarViaje } from "@/lib/schemas/exportacion";
import {
  EVENTOS, SENTIDOS, TURNOS, fechaHoraViaje, fechaViaje, filtrosViajes,
  nombreBus, paginaEventos, urlViajes, viajeId,
  type FilaAsistencia, type Parametros,
} from "@/lib/schemas/viajes";
import { obtenerViaje } from "../queries";
import { EstadoViaje, PaginacionViajes } from "../ui";
import { BotonExportar } from "../../boton-exportar";

function Alumno({ evento }: { evento: FilaAsistencia }) {
  return evento.student_name
    ? <Link prefetch={false} className="ad-rowlink ad-viajes-texto" href={`/alumnos/${evento.student_id}`}>{evento.student_name}</Link>
    : "—";
}

function TipoEvento({ evento }: { evento: FilaAsistencia }) {
  return (
    <div className="ad-tags">
      <span className="ad-tag neutral">{EVENTOS[evento.event_type]}</span>
      {evento.voided_at && <span className="ad-tag warn">Anulado</span>}
    </div>
  );
}

export default async function Viaje({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Parametros>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!viajeId.safeParse(id).success) notFound();
  const sp = await searchParams;
  const pagina = paginaEventos(sp);
  const { filtros, filtrado } = filtrosViajes(sp);
  const detalle = await obtenerViaje(supabase, id, pagina);
  if (!detalle) notFound();
  const { viaje, resumen, total, filas } = detalle;
  const eventos = filas.map((evento) => ({ ...evento, hora: fechaHoraViaje(evento.scanned_at) }));

  return (
    <div className="ad-stack narrow-page">
      <nav aria-label="Ruta" className="ad-crumbs">
        <Link href={filtrado || filtros.page > 1 ? urlViajes(filtros) : "/viajes"}>Volver a viajes</Link>
      </nav>

      <section className="ad-card ad-pad" aria-labelledby="viaje-titulo">
        <div className="ad-head">
          <h2 id="viaje-titulo" className="ad-title">{SENTIDOS[viaje.direction]} · {fechaViaje(viaje.trip_date)}</h2>
          <EstadoViaje estado={viaje.status} />
        </div>
        <dl className="ad-dl">
          <div><dt>Bus</dt><dd>{nombreBus(viaje.bus_code, viaje.bus_label)}</dd></div>
          <div><dt>Turno</dt><dd>{viaje.turn_type ? TURNOS[viaje.turn_type] : "—"}</dd></div>
          <div><dt>Inicio</dt><dd className="ad-num">{fechaHoraViaje(viaje.started_at)}</dd></div>
          <div><dt>Cierre</dt><dd className="ad-num">{fechaHoraViaje(viaje.ended_at)}</dd></div>
        </dl>
      </section>

      <section className="ad-card ad-pad" aria-labelledby="resumen-titulo">
        <h2 id="resumen-titulo" className="ad-h2">Resumen de asistencia</h2>
        <dl className="ad-dl">
          <div><dt>Subidas</dt><dd className="ad-num">{resumen.subidas}</dd></div>
          <div><dt>Bajadas</dt><dd className="ad-num">{resumen.bajadas}</dd></div>
          <div><dt>Ausencias</dt><dd className="ad-num">{resumen.ausencias}</dd></div>
          <div><dt>Bajadas pendientes</dt><dd className="ad-num">{resumen.pendientes}</dd></div>
        </dl>
      </section>

      <section className="ad-stack" aria-labelledby="eventos-titulo">
        <div className="ad-head">
          <h2 id="eventos-titulo" className="ad-h2">Registros de asistencia</h2>
          <BotonExportar endpoint={urlExportarViaje(id)} />
        </div>
        {total === 0 && <div className="ad-empty" role="status">Este viaje todavía no tiene registros de asistencia.</div>}

        {eventos.length > 0 && (
          <>
            <div className="ad-card ad-tablewrap">
              <table className="ad-tbl wide">
                <caption className="ad-sr">Registros de asistencia del viaje, del más reciente al más antiguo</caption>
                <thead>
                  <tr>
                    <th scope="col">Alumno</th><th scope="col">Evento</th><th scope="col">Hora registrada</th>
                    <th scope="col">Operador</th><th scope="col">Motivo de anulación</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((evento) => (
                    <tr key={evento.id}>
                      <td><Alumno evento={evento} /></td><td><TipoEvento evento={evento} /></td>
                      <td className="ad-num">{evento.hora}</td><td className="ad-viajes-texto">{evento.operator_name ?? "—"}</td>
                      <td className="ad-viajes-texto">{evento.void_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="ad-cards">
              {eventos.map((evento) => (
                <li key={evento.id} className="ad-card ad-movimiento">
                  <div className="ad-movimiento-top"><Alumno evento={evento} /><TipoEvento evento={evento} /></div>
                  <dl className="ad-dl two">
                    <div><dt>Hora registrada</dt><dd className="ad-num">{evento.hora}</dd></div>
                    <div><dt>Operador</dt><dd>{evento.operator_name ?? "—"}</dd></div>
                    {evento.voided_at && <div className="wide"><dt>Motivo de anulación</dt><dd>{evento.void_reason ?? "—"}</dd></div>}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}

        <PaginacionViajes pagina={pagina} total={total} enlace={(p) => urlViajes(filtros, id, p)} singular="registro" plural="registros" />
      </section>
    </div>
  );
}
