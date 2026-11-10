import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listaSchema, PAGE_SIZE, type EstadoAlumno } from "@/lib/schemas/alumnos";
import { TablaAlumnos, type Fila } from "./tabla";

const FILTROS: { valor?: EstadoAlumno; texto: string }[] = [
  { texto: "Todos" },
  { valor: "beneficiario", texto: "Beneficiarios" },
  { valor: "baja", texto: "De baja" },
  { valor: "sin_alta", texto: "Sin alta" },
];

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(f: { q: string; estado?: string; page?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.estado) p.set("estado", f.estado);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/alumnos?${s}` : "/alumnos";
}

export default async function Alumnos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const f = listaSchema.parse({ q: uno(sp.q), estado: uno(sp.estado), page: uno(sp.page) });

  // total (todas las filas que cumplen el filtro) viene repetido en cada fila.
  const { data, error } = await supabase.rpc("admin_list_students", {
    p_q: f.q || null,
    p_estado: f.estado ?? null,
    p_limit: PAGE_SIZE,
    p_offset: (f.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error("No se pudo cargar la lista de alumnos.");
  const filas = (data ?? []) as (Fila & { total: number })[];
  const total = Number(filas[0]?.total ?? 0);
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <form role="search" method="get" action="/alumnos" className="ad-search">
          <label htmlFor="q" className="ad-sr">Buscar alumno</label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <input id="q" name="q" type="search" defaultValue={f.q} maxLength={100} placeholder="Buscar por código, nombre o DNI" autoComplete="off" />
          {f.estado && <input type="hidden" name="estado" value={f.estado} />}
        </form>
        <nav aria-label="Filtrar por estado" className="ad-chips">
          {FILTROS.map((x) => (
            <Link key={x.texto} className="ad-chip" href={href({ q: f.q, estado: x.valor })} aria-current={(f.estado ?? undefined) === x.valor ? "true" : undefined}>
              {x.texto}
            </Link>
          ))}
        </nav>
      </div>

      {filas.length === 0 ? (
        <div className="ad-empty" role="status">
          {f.q || f.estado ? "No hay alumnos con esa búsqueda o filtro." : "Todavía no hay alumnos en el padrón."}
          {(f.q || f.estado) && <Link href="/alumnos" className="ad-link">Quitar filtros</Link>}
        </div>
      ) : (
        <TablaAlumnos filas={filas} />
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
