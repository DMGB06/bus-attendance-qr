import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { anioActual, anioCarnet, estadoCarnet } from "@/lib/carnet/estado";
import { idSchema, type EstadoCarnetFila } from "@/lib/schemas/carnets";
import { AccionesCarnet } from "./acciones";
import { VistaPrevia } from "./vista-previa";

const fecha = (iso: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

type Emision = { code: string; status: string; reason: string | null; issued_at: string; closed_at: string | null };

export default async function CarnetAlumno({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const [padron, benef, historial] = await Promise.all([
    supabase.schema("public").from("social_bus_escolar").select("id, codigo, nombre_alumno").eq("id", id).maybeSingle(),
    supabase.from("bus_beneficiaries").select("is_active").eq("student_id", id).maybeSingle(),
    supabase.from("qr_codes").select("code, status, reason, issued_at, closed_at").eq("student_id", id).order("issued_at", { ascending: false }),
  ]);
  if (padron.error || benef.error || historial.error) throw new Error("No se pudo cargar el carnet.");
  const a = padron.data;
  if (!a) notFound();

  const emisiones = (historial.data ?? []) as Emision[];
  const vigente = emisiones.find((e) => e.status === "vigente");
  const estado: EstadoCarnetFila = vigente
    ? estadoCarnet(vigente) === "vencido" ? "vencido" : "vigente"
    : emisiones[0]?.status === "reportado_perdido" ? "perdido" : "sin_carnet";
  const codigo = a.codigo?.trim() ?? "";
  const puedeEmitir = !!benef.data?.is_active && !!codigo;
  const anio = vigente ? anioCarnet(vigente.issued_at) : anioActual();
  const perdido = emisiones.find((e) => e.status === "reportado_perdido");

  return (
    <div className="ad-stack narrow-page">
      <nav aria-label="Ruta" className="ad-crumbs">
        <Link href="/qr">Carnets QR</Link> <span aria-hidden="true">/</span> <span>{a.nombre_alumno}</span>
      </nav>

      <section className="ad-card ad-pad ad-carnet-fila" aria-labelledby="nombre">
        <figure className="ad-figure">
          {codigo ? <VistaPrevia carnet={{ codigo, nombre: a.nombre_alumno, anio }} /> : <div className="ad-carnet ad-carnet-vacio" role="status">Sin código: no hay carnet que mostrar</div>}
          <figcaption className="ad-note">
            {vigente ? "El carnet que se imprime: mica de 95 × 60 mm, igual al del script de carnets. El QR lleva el código del padrón." : `Vista previa de cómo saldría el carnet ${anio}. Todavía no está emitido.`}
          </figcaption>
        </figure>

        <div className="ad-stack grow">
          <div className="ad-stack tight">
            <h2 id="nombre" className="ad-h2 big">{a.nombre_alumno}</h2>
            <div className="ad-tags">
              {estado === "vigente" && <span className="ad-tag ok">Vigente {anio}</span>}
              {estado === "vencido" && <span className="ad-tag warn">Vencido {anio}</span>}
              {estado === "perdido" && <span className="ad-tag bad">Perdido</span>}
              {estado === "sin_carnet" && <span className="ad-tag neutral">Sin carnet</span>}
              <span className="ad-muted">Código <strong className="ad-num">{codigo || "—"}</strong></span>
            </div>
            <Link className="ad-link" href={`/alumnos/${a.id}`}>Ver ficha del alumno</Link>
          </div>

          {estado === "vigente" && vigente && <p className="ad-text">Emitido el {fecha(vigente.issued_at)}. Descargar no cambia nada: solo deja registrada la impresión en la auditoría.</p>}
          {estado === "vencido" && <p className="ad-warn">Este carnet es de {anio} y ya venció. Emite uno nuevo para {anioActual()}: el anterior queda como reemplazado y el código no cambia.</p>}
          {estado === "perdido" && perdido && (
            <p className="ad-info" role="status">Reportado como perdido el {perdido.closed_at ? fecha(perdido.closed_at) : "—"}: &quot;{perdido.reason}&quot;. Para entregarle otro, vuelve a emitirlo: el código es el mismo.</p>
          )}
          {estado === "sin_carnet" && <p className="ad-text">Este alumno todavía no tiene carnet. Al emitirlo se usa su código del padrón y queda registrado.</p>}

          <AccionesCarnet studentId={a.id} nombre={a.nombre_alumno} estado={estado} anioCarnet={vigente ? anio : null} puedeEmitir={puedeEmitir} />
          {!codigo && <p className="ad-warn" role="status">Este alumno no tiene código en el padrón: no se puede emitir su carnet hasta que el padrón lo tenga.</p>}
          {codigo && !benef.data?.is_active && estado !== "vigente" && estado !== "vencido" && <p className="ad-warn" role="status">Solo los beneficiarios activos tienen carnet. Da de alta al alumno en Alumnos.</p>}
          {estado === "perdido" && <p className="ad-note">El carnet perdido sigue funcionando en el bus: el móvil no consulta esta lista. Es una limitación conocida y aceptada.</p>}
        </div>
      </section>

      <section className="ad-card ad-pad" aria-labelledby="his">
        <h2 id="his" className="ad-h2">Historial de emisiones</h2>
        {emisiones.length === 0 ? (
          <p className="ad-muted">Todavía no se emitió ningún carnet.</p>
        ) : (
          <ul className="ad-list">
            {emisiones.map((e) => (
              <li key={e.issued_at + e.status}>
                <span>
                  <strong>{fecha(e.issued_at)}</strong> · Emitido{e.status === "reemplazado" && e.closed_at ? ` · reemplazado el ${fecha(e.closed_at)}` : ""}{e.status === "reportado_perdido" && e.reason ? ` · ${e.reason}` : ""}
                </span>
                {e.status === "vigente" ? <span className="ad-tag ok">Vigente</span> : e.status === "reportado_perdido" ? <span className="ad-tag bad">Perdido</span> : <span className="ad-tag neutral">Reemplazado</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
