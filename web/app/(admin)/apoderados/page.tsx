import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { maskPhone } from "@/lib/mask";
import { listaSchema, PAGE_SIZE, type FiltroApoderado } from "@/lib/schemas/apoderados";
import { FormApoderado } from "./form-apoderado";

const FILTROS: { valor?: FiltroApoderado; texto: string }[] = [
  { texto: "Todos" },
  { valor: "activo", texto: "Activos" },
  { valor: "desactivado", texto: "Desactivados" },
  { valor: "con_cuenta", texto: "Con cuenta" },
  { valor: "sin_cuenta", texto: "Sin cuenta" },
];

type Fila = { guardian_id: string; full_name: string; phone: string | null; is_active: boolean; has_account: boolean; students_count: number; first_student: string | null; total: number };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(f: { q: string; filtro?: string; page?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.filtro) p.set("filtro", f.filtro);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `/apoderados?${s}` : "/apoderados";
}

const Alumnos = ({ f }: { f: Fila }) =>
  f.students_count === 0 ? <span className="ad-tag warn">Sin alumnos</span> : <>{f.first_student}{f.students_count > 1 ? ` y ${f.students_count - 1} más` : ""}</>;
const Cuenta = ({ f }: { f: Fila }) =>
  !f.has_account ? <span className="ad-tag neutral">Sin cuenta</span> : f.is_active ? <span className="ad-tag ok">Con cuenta</span> : <span className="ad-tag neutral">Cuenta bloqueada</span>;
const Estado = ({ f }: { f: Fila }) => (f.is_active ? <span className="ad-tag ok">Activo</span> : <span className="ad-tag neutral">Desactivado</span>);
const Telefono = ({ f }: { f: Fila }) => (f.phone ? <span className="ad-num">{maskPhone(f.phone) || "—"}</span> : <span className="ad-muted">Sin teléfono</span>);

export default async function Apoderados({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const f = listaSchema.parse({ q: uno(sp.q), filtro: uno(sp.filtro), page: uno(sp.page) });

  const { data, error } = await supabase.rpc("admin_list_guardians", {
    p_q: f.q || null, p_filtro: f.filtro ?? null, p_limit: PAGE_SIZE, p_offset: (f.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error("No se pudo cargar la lista de apoderados.");
  const filas = (data ?? []) as Fila[];
  const total = Number(filas[0]?.total ?? 0);
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <form role="search" method="get" action="/apoderados" className="ad-search">
          <label htmlFor="q" className="ad-sr">Buscar apoderado</label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <input id="q" name="q" type="search" defaultValue={f.q} maxLength={100} placeholder="Buscar por nombre, teléfono o DNI" autoComplete="off" />
          {f.filtro && <input type="hidden" name="filtro" value={f.filtro} />}
        </form>
        <FormApoderado boton="Nuevo apoderado" />
      </div>
      <nav aria-label="Filtrar" className="ad-chips">
        {FILTROS.map((x) => (
          <Link key={x.texto} className="ad-chip" href={href({ q: f.q, filtro: x.valor })} aria-current={(f.filtro ?? undefined) === x.valor ? "true" : undefined}>{x.texto}</Link>
        ))}
      </nav>

      {filas.length === 0 ? (
        <div className="ad-empty" role="status">
          {f.q || f.filtro ? "No hay apoderados con esa búsqueda o filtro." : "Todavía no hay apoderados. Crea el primero con \"Nuevo apoderado\"."}
          {(f.q || f.filtro) && <Link href="/apoderados" className="ad-link">Quitar filtros</Link>}
        </div>
      ) : (
        <>
          <div className="ad-card ad-tablewrap">
            <table className="ad-tbl">
              <caption className="ad-sr">Lista de apoderados</caption>
              <thead>
                <tr><th scope="col">Apoderado</th><th scope="col">Teléfono</th><th scope="col">Alumnos</th><th scope="col">Cuenta en la app</th><th scope="col">Estado</th></tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.guardian_id}>
                    <td><Link className="ad-rowlink" href={`/apoderados/${r.guardian_id}`}>{r.full_name}</Link></td>
                    <td><Telefono f={r} /></td>
                    <td><Alumnos f={r} /></td>
                    <td><Cuenta f={r} /></td>
                    <td><Estado f={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="ad-cards">
            {filas.map((r) => (
              <li key={r.guardian_id} className="ad-card ad-alumno">
                <div className="ad-alumno-top">
                  <Link className="ad-rowlink" href={`/apoderados/${r.guardian_id}`}>{r.full_name}</Link>
                  <Telefono f={r} />
                </div>
                <div className="ad-tags"><Estado f={r} /><Cuenta f={r} /></div>
                <span className="ad-muted"><Alumnos f={r} /></span>
              </li>
            ))}
          </ul>
        </>
      )}

      {total > 0 && (
        <div className="ad-pager">
          <span className="ad-muted">Página {f.page} de {paginas} · {total} {total === 1 ? "apoderado" : "apoderados"}</span>
          <div className="ad-actions">
            {f.page > 1 ? <Link className="ad-btn outline" href={href({ ...f, page: f.page - 1 })}>Anterior</Link> : <span className="ad-btn outline" aria-disabled="true">Anterior</span>}
            {f.page < paginas ? <Link className="ad-btn outline" href={href({ ...f, page: f.page + 1 })}>Siguiente</Link> : <span className="ad-btn outline" aria-disabled="true">Siguiente</span>}
          </div>
        </div>
      )}
    </div>
  );
}
