import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listaSchema, PAGE_SIZE, type FiltroCarnet } from "@/lib/schemas/carnets";
import { TablaCarnets, type Fila } from "./tabla-carnets";

const CHIPS: { valor?: FiltroCarnet; texto: string }[] = [
  { texto: "Todos" },
  { valor: "vigente", texto: "Vigentes" },
  { valor: "por_emitir", texto: "Por emitir" },
  { valor: "vencido", texto: "Vencidos" },
  { valor: "perdido", texto: "Perdidos" },
];

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(f: { q: string; filtro?: string; page?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.filtro) p.set("filtro", f.filtro);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/qr?${s}` : "/qr";
}

export default async function Carnets({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const f = listaSchema.parse({ q: uno(sp.q), filtro: uno(sp.filtro), page: uno(sp.page) });

  const { data, error } = await supabase.rpc("admin_list_cards", {
    p_q: f.q || null, p_filtro: f.filtro ?? null, p_limit: PAGE_SIZE, p_offset: (f.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error("No se pudo cargar la lista de carnets.");
  const filas = (data ?? []) as (Fila & { total: number })[];
  const total = Number(filas[0]?.total ?? 0);
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="ad-stack">
      <form role="search" method="get" action="/qr" className="ad-search wide">
        <label htmlFor="q" className="ad-sr">Buscar alumno</label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
        <input id="q" name="q" type="search" defaultValue={f.q} maxLength={100} placeholder="Buscar por código, nombre o DNI" autoComplete="off" />
        {f.filtro && <input type="hidden" name="filtro" value={f.filtro} />}
      </form>
      <nav aria-label="Filtrar" className="ad-chips">
        {CHIPS.map((x) => (
          <Link key={x.texto} className="ad-chip" href={href({ q: f.q, filtro: x.valor })} aria-current={(f.filtro ?? undefined) === x.valor ? "true" : undefined}>{x.texto}</Link>
        ))}
      </nav>
      <p className="ad-muted">Solo los beneficiarios activos tienen carnet, y hace falta su código del padrón. Marca varios alumnos para imprimirlos juntos: cada hoja A4 trae 8 carnets.</p>

      {filas.length === 0 ? (
        <div className="ad-empty" role="status">
          {f.q || f.filtro ? "No hay alumnos con esa búsqueda o filtro." : "Todavía no hay beneficiarios. Da de alta alumnos en Alumnos."}
          {(f.q || f.filtro) && <Link href="/qr" className="ad-link">Quitar filtros</Link>}
        </div>
      ) : (
        // key: al cambiar de página, búsqueda o filtro la selección empieza de cero (solo se imprime lo que se ve)
        <TablaCarnets key={href(f)} filas={filas} />
      )}

      {total > 0 && (
        <div className="ad-pager">
          <span className="ad-muted">Página {f.page} de {paginas} · {total} {total === 1 ? "alumno" : "alumnos"}</span>
          <div className="ad-actions">
            {f.page > 1 ? <Link className="ad-btn outline" href={href({ ...f, page: f.page - 1 })}>Anterior</Link> : <span className="ad-btn outline" aria-disabled="true">Anterior</span>}
            {f.page < paginas ? <Link className="ad-btn outline" href={href({ ...f, page: f.page + 1 })}>Siguiente</Link> : <span className="ad-btn outline" aria-disabled="true">Siguiente</span>}
          </div>
        </div>
      )}
    </div>
  );
}
