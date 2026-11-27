import Link from "next/link";
import { ESTADOS, PAGE_SIZE, type FilaViaje } from "@/lib/schemas/viajes";

export function EstadoViaje({ estado }: { estado: FilaViaje["status"] }) {
  return <span className={`ad-tag ${estado === "active" ? "ok" : "neutral"}`}>{ESTADOS[estado]}</span>;
}

export function PaginacionViajes({ pagina, total, enlace, singular, plural }: {
  pagina: number;
  total: number;
  enlace: (pagina: number) => string;
  singular: string;
  plural: string;
}) {
  if (!total) return null;
  const paginas = Math.ceil(total / PAGE_SIZE);
  if (pagina > paginas) {
    return (
      <div className="ad-empty" role="status">
        Esta página está fuera del rango.
        <Link className="ad-link" href={enlace(paginas)}>Ir a la última página</Link>
      </div>
    );
  }

  return (
    <nav className="ad-pager" aria-label="Paginación">
      <span className="ad-muted">Página {pagina} de {paginas} · {total} {total === 1 ? singular : plural}</span>
      <div className="ad-actions">
        {pagina > 1
          ? <Link className="ad-btn outline" prefetch={false} href={enlace(pagina - 1)}>Anterior</Link>
          : <span className="ad-btn outline" aria-disabled="true">Anterior</span>}
        {pagina < paginas
          ? <Link className="ad-btn outline" prefetch={false} href={enlace(pagina + 1)}>Siguiente</Link>
          : <span className="ad-btn outline" aria-disabled="true">Siguiente</span>}
      </div>
    </nav>
  );
}
