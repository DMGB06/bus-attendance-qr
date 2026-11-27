import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { urlExportarViajes } from "@/lib/schemas/exportacion";
import {
  ESTADOS, SENTIDOS, TURNOS, fechaViaje, filtrosViajes, horaViaje, nombreBus, urlViajes,
  type Parametros,
} from "@/lib/schemas/viajes";
import { listarBuses, listarViajes } from "./queries";
import { EstadoViaje, PaginacionViajes } from "./ui";
import { BotonExportar } from "../boton-exportar";

export default async function Viajes({ searchParams }: { searchParams: Promise<Parametros> }) {
  const { supabase } = await requireAdmin();
  const { filtros: f, error, filtrado } = filtrosViajes(await searchParams);
  const exportar = urlExportarViajes(f);
  const [buses, { filas, total }] = await Promise.all([
    listarBuses(supabase),
    error ? { filas: [], total: 0 } : listarViajes(supabase, f),
  ]);
  const viajes = filas.map((viaje) => ({
    ...viaje,
    bus: nombreBus(viaje.bus_code, viaje.bus_label),
    fecha: fechaViaje(viaje.trip_date),
    turno: viaje.turn_type ? TURNOS[viaje.turn_type] : "—",
    sentido: SENTIDOS[viaje.direction],
    inicio: horaViaje(viaje.started_at),
    cierre: horaViaje(viaje.ended_at),
    href: urlViajes(f, viaje.id),
  }));

  return (
    <div className="ad-stack">
      <form key={urlViajes(f)} method="get" action="/viajes" className="ad-filtros ad-viajes-filtros">
        <div className="ad-field">
          <label htmlFor="desde">Desde</label>
          <input id="desde" name="desde" type="date" defaultValue={f.desde ?? ""} />
        </div>
        <div className="ad-field">
          <label htmlFor="hasta">Hasta</label>
          <input id="hasta" name="hasta" type="date" defaultValue={f.hasta ?? ""} />
        </div>
        <div className="ad-field">
          <label htmlFor="bus">Bus</label>
          <select id="bus" name="bus" className="ad-input" defaultValue={f.bus ?? ""}>
            <option value="">Todos los buses</option>
            {buses.map((bus) => <option key={bus.id} value={bus.id}>{nombreBus(bus.code, bus.label)}</option>)}
            {f.bus && !buses.some((bus) => bus.id === f.bus) && <option value={f.bus}>Bus no disponible</option>}
          </select>
        </div>
        {([
          ["turno", "Turno", "Todos los turnos", TURNOS],
          ["sentido", "Sentido", "Todos los sentidos", SENTIDOS],
          ["estado", "Estado", "Todos los estados", ESTADOS],
        ] as const).map(([id, label, opcion, valores]) => (
          <div className="ad-field" key={id}>
            <label htmlFor={id}>{label}</label>
            <select id={id} name={id} className="ad-input" defaultValue={f[id] ?? ""}>
              <option value="">{opcion}</option>
              {Object.entries(valores).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </div>
        ))}
        <button type="submit" className="ad-btn primary">Filtrar</button>
        {filtrado && <Link href="/viajes" className="ad-link">Quitar filtros</Link>}
      </form>

      <BotonExportar key={exportar} endpoint={exportar} deshabilitado={!!error} />
      {error && <p className="ad-error" role="alert">{error}</p>}
      {!error && total === 0 && (
        <div className="ad-empty" role="status">
          {filtrado ? "No hay viajes con esos filtros." : "No hay viajes en los últimos siete días."}
        </div>
      )}

      {viajes.length > 0 && (
        <>
          <div className="ad-card ad-tablewrap">
            <table className="ad-tbl wide">
              <caption className="ad-sr">Viajes registrados, del más reciente al más antiguo</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th><th scope="col">Bus</th><th scope="col">Turno</th>
                  <th scope="col">Sentido</th><th scope="col">Estado</th>
                  <th scope="col">Inicio</th><th scope="col">Cierre</th>
                </tr>
              </thead>
              <tbody>
                {viajes.map((v) => (
                  <tr key={v.id}>
                    <td className="ad-nowrap ad-num"><Link prefetch={false} className="ad-rowlink" href={v.href} aria-label={`Ver viaje: ${v.sentido}, ${v.fecha}, ${v.bus}`}>{v.fecha}</Link></td>
                    <td>{v.bus}</td><td>{v.turno}</td><td>{v.sentido}</td><td><EstadoViaje estado={v.status} /></td>
                    <td className="ad-num">{v.inicio}</td><td className="ad-num">{v.cierre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="ad-cards">
            {viajes.map((v) => (
              <li key={v.id} className="ad-card ad-movimiento">
                <div className="ad-movimiento-top">
                  <Link prefetch={false} className="ad-rowlink" href={v.href} aria-label={`Ver viaje: ${v.sentido}, ${v.fecha}, ${v.bus}`}>{v.fecha} · {v.sentido}</Link>
                  <EstadoViaje estado={v.status} />
                </div>
                <dl className="ad-dl two">
                  <div><dt>Bus</dt><dd>{v.bus}</dd></div><div><dt>Turno</dt><dd>{v.turno}</dd></div>
                  <div><dt>Inicio</dt><dd className="ad-num">{v.inicio}</dd></div><div><dt>Cierre</dt><dd className="ad-num">{v.cierre}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      <PaginacionViajes pagina={f.page} total={total} enlace={(page) => urlViajes({ ...f, page })} singular="viaje" plural="viajes" />
    </div>
  );
}
