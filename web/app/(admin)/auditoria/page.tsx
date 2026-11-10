import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { describir, ETIQUETA, type Descripcion } from "@/lib/auditoria/describir";
import { GRUPOS, listaSchema, PAGE_SIZE, type FilaAuditoria, type Grupo } from "@/lib/schemas/auditoria";
import { listarAuditoria } from "./queries";

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const lima = { timeZone: "America/Lima" } as const;
const fechaLima = new Intl.DateTimeFormat("es-PE", { ...lima, day: "2-digit", month: "2-digit", year: "numeric" });
const horaLima = new Intl.DateTimeFormat("es-PE", { ...lima, hour: "2-digit", minute: "2-digit", hour12: false });
const hoyIso = (d: Date) => new Intl.DateTimeFormat("en-CA", { ...lima, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function href(f: { desde?: string; hasta?: string; grupo?: string; page?: number }) {
  const p = new URLSearchParams();
  p.set("desde", f.desde ?? "");
  p.set("hasta", f.hasta ?? "");
  if (f.grupo) p.set("grupo", f.grupo);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return `/auditoria?${p.toString()}`;
}

const Sobre = ({ d }: { d: Descripcion }) =>
  !d.sobre ? <span className="ad-muted">—</span> : d.sobre.href ? <Link className="ad-rowlink" href={d.sobre.href}>{d.sobre.texto}</Link> : <span>{d.sobre.texto}</span>;

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const f = listaSchema.parse({ desde: uno(sp.desde), hasta: uno(sp.hasta), grupo: uno(sp.grupo), page: uno(sp.page) });

  // Sin fechas en la dirección: los últimos 30 días. Con fechas (aunque estén vacías) se respeta lo que se eligió.
  const sinParametros = sp.desde === undefined && sp.hasta === undefined;
  const hoy = new Date();
  const desde = sinParametros ? hoyIso(new Date(hoy.getTime() - 29 * 86_400_000)) : f.desde;
  const hasta = sinParametros ? hoyIso(hoy) : f.hasta;
  const rangoMal = !!desde && !!hasta && desde > hasta;

  const { filas, total } = rangoMal ? { filas: [] as FilaAuditoria[], total: 0 } : await listarAuditoria(supabase, { desde, hasta, grupo: f.grupo, page: f.page });
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const movimientos = filas.map((r) => ({ r, d: describir(r), t: new Date(r.created_at) })); // describir una sola vez por fila
  const filtrado = !!f.grupo || !sinParametros;
  const filtros = { desde, hasta, grupo: f.grupo };
  const chips: { valor?: Grupo; texto: string }[] = [{ texto: "Todos" }, ...GRUPOS.map((g) => ({ valor: g, texto: ETIQUETA[g] }))];

  return (
    <div className="ad-stack">
      <p className="ad-muted">Aquí queda registrado cada cambio hecho en el panel: qué se hizo, sobre quién y cuándo. Solo se puede consultar, no editar. Las contraseñas nunca se guardan.</p>

      <form method="get" action="/auditoria" className="ad-filtros">
        <div className="ad-field">
          <label htmlFor="desde">Desde</label>
          <input id="desde" name="desde" type="date" defaultValue={desde ?? ""} />
        </div>
        <div className="ad-field">
          <label htmlFor="hasta">Hasta</label>
          <input id="hasta" name="hasta" type="date" defaultValue={hasta ?? ""} />
        </div>
        {f.grupo && <input type="hidden" name="grupo" value={f.grupo} />}
        <button type="submit" className="ad-btn primary">Filtrar</button>
        {filtrado && <Link href="/auditoria" className="ad-link">Quitar filtros</Link>}
      </form>

      <nav aria-label="Tipo de movimiento" className="ad-chips">
        {chips.map((c) => (
          <Link key={c.texto} className="ad-chip" href={href({ ...filtros, grupo: c.valor })} aria-current={f.grupo === c.valor ? "true" : undefined}>{c.texto}</Link>
        ))}
      </nav>

      {rangoMal && <p className="ad-error" role="alert">La fecha inicial no puede ser posterior a la final.</p>}

      {filas.length === 0 ? (
        !rangoMal && (
          <div className="ad-empty" role="status">
            {filtrado ? "No hay movimientos con esos filtros. Prueba con otras fechas o quita el filtro de tipo." : "Todavía no hay movimientos registrados."}
            {filtrado && <Link href="/auditoria" className="ad-link">Quitar filtros</Link>}
          </div>
        )
      ) : (
        <>
          <div className="ad-card ad-tablewrap">
            <table className="ad-tbl wide">
              <caption className="ad-sr">Movimientos registrados, del más reciente al más antiguo</caption>
              <thead>
                <tr><th scope="col">Fecha y hora</th><th scope="col">Qué se hizo</th><th scope="col">Sobre</th><th scope="col">Detalle</th><th scope="col">Quién</th></tr>
              </thead>
              <tbody>
                {movimientos.map(({ r, d, t }) => {
                  return (
                    <tr key={r.id}>
                      <td className="ad-nowrap ad-num">{fechaLima.format(t)}<br /><span className="ad-note">{horaLima.format(t)}</span></td>
                      <td><strong>{d.titulo}</strong><br /><span className="ad-tag neutral">{d.etiqueta}</span></td>
                      <td><Sobre d={d} /></td>
                      <td>{d.detalle ?? <span className="ad-muted">—</span>}</td>
                      <td className="ad-note">{r.actor_email ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="ad-cards">
            {movimientos.map(({ r, d, t }) => {
              return (
                <li key={r.id} className="ad-card ad-movimiento">
                  <div className="ad-movimiento-top"><strong>{d.titulo}</strong><span className="ad-tag neutral">{d.etiqueta}</span></div>
                  {d.sobre && <Sobre d={d} />}
                  {d.detalle && <span>{d.detalle}</span>}
                  <span className="ad-note">{fechaLima.format(t)} {horaLima.format(t)} · {r.actor_email ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {total > 0 && (
        <div className="ad-pager">
          <span className="ad-muted">Página {f.page} de {paginas} · {total} {total === 1 ? "movimiento" : "movimientos"}</span>
          <div className="ad-actions">
            {f.page > 1 ? <Link className="ad-btn outline" href={href({ ...filtros, page: f.page - 1 })}>Anterior</Link> : <span className="ad-btn outline" aria-disabled="true">Anterior</span>}
            {f.page < paginas ? <Link className="ad-btn outline" href={href({ ...filtros, page: f.page + 1 })}>Siguiente</Link> : <span className="ad-btn outline" aria-disabled="true">Siguiente</span>}
          </div>
        </div>
      )}
    </div>
  );
}
