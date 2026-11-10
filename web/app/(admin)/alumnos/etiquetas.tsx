import type { EstadoAlumno } from "@/lib/schemas/alumnos";
import { anioCarnet, estadoCarnet } from "@/lib/carnet/estado";

export type Carnet = { status: string; issued_at: string } | null;

export function EstadoTag({ estado, largo = false }: { estado: EstadoAlumno; largo?: boolean }) {
  if (estado === "beneficiario") return <span className="ad-tag ok">{largo ? "Beneficiario activo" : "Beneficiario"}</span>;
  if (estado === "baja") return <span className="ad-tag neutral">De baja</span>;
  return <span className="ad-tag outline">Sin alta</span>;
}

// Sin carnet vigente se muestra "Sin carnet"; un vigente de un año anterior se muestra "Vencido".
export function CarnetTag({ carnet, estado }: { carnet: Carnet; estado?: EstadoAlumno }) {
  if (!carnet) return estado === "sin_alta" ? <span className="ad-muted">No aplica</span> : <span className="ad-tag neutral">Sin carnet</span>;
  const e = estadoCarnet(carnet);
  const anio = anioCarnet(carnet.issued_at);
  if (e === "vigente") return <span className="ad-tag ok">Vigente {anio}</span>;
  if (e === "vencido") return <span className="ad-tag warn">Vencido {anio}</span>;
  return <span className="ad-tag neutral">{e === "reportado_perdido" ? "Perdido" : "Reemplazado"}</span>;
}
