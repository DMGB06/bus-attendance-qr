import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { anioCarnet, estadoCarnet } from "@/lib/carnet/estado";
import { maskDni, maskPhone } from "@/lib/mask";
import type { EstadoAlumno } from "@/lib/schemas/alumnos";
import { CarnetTag, EstadoTag } from "../etiquetas";
import { AccionesAlumno } from "./acciones";

const fecha = (iso: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

type Guardian = { full_name: string; phone: string | null; auth_user_id: string | null; is_active: boolean };
type Vinculo = { id: string; relationship: string; is_primary: boolean; guardian: Guardian | Guardian[] | null };

export default async function FichaAlumno({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();

  const [padron, benef, vinculos, carnet] = await Promise.all([
    supabase.schema("public").from("social_bus_escolar")
      .select("id, codigo, nombre_alumno, dni_alumno, edad, sexo, colegio, nivel_educativo, direccion, notas, nombre_apoderado, telefono_apoderado")
      .eq("id", id).maybeSingle(),
    supabase.from("bus_beneficiaries").select("is_active, enrolled_at, deactivated_at, deactivated_reason").eq("student_id", id).maybeSingle(),
    supabase.from("bus_student_guardians")
      .select("id, relationship, is_primary, guardian:bus_guardians(full_name, phone, auth_user_id, is_active)")
      .eq("student_id", id).order("is_primary", { ascending: false }),
    supabase.from("qr_codes").select("code, status, issued_at").eq("student_id", id).eq("status", "vigente").maybeSingle(),
  ]);
  if (padron.error) throw new Error("No se pudo cargar el alumno.");
  const a = padron.data;
  if (!a) notFound();
  if (benef.error || vinculos.error || carnet.error) throw new Error("No se pudo cargar la ficha del alumno.");

  const b = benef.data;
  const estado: EstadoAlumno = !b ? "sin_alta" : b.is_active ? "beneficiario" : "baja";
  const apoderados = ((vinculos.data ?? []) as unknown as Vinculo[]).map((v) => ({ ...v, g: Array.isArray(v.guardian) ? v.guardian[0] : v.guardian })).filter((v) => v.g);
  const c = carnet.data;

  return (
    <div className="ad-stack narrow-page">
      <nav aria-label="Ruta" className="ad-crumbs">
        <Link href="/alumnos">Alumnos</Link> <span aria-hidden="true">/</span> <span>{a.nombre_alumno}</span>
      </nav>

      <section className="ad-card ad-pad" aria-labelledby="nombre">
        <div className="ad-head">
          <div className="ad-stack tight">
            <h2 id="nombre" className="ad-title">{a.nombre_alumno}</h2>
            <div className="ad-tags">
              <span className="ad-tag code">{a.codigo ? `CÓDIGO ${a.codigo}` : "SIN CÓDIGO"}</span>
              <EstadoTag estado={estado} largo />
            </div>
          </div>
          <AccionesAlumno studentId={a.id} nombre={a.nombre_alumno} estado={estado} />
        </div>

        {estado === "baja" && (
          <div className="ad-info" role="status">
            <strong>Dado de baja el {b?.deactivated_at ? fecha(b.deactivated_at) : "—"}.</strong> Motivo: {b?.deactivated_reason ?? "—"}. No aparece en la app móvil ni puede registrar asistencia. Su historial y su carnet se conservan.
          </div>
        )}
        {estado === "sin_alta" && (
          <div className="ad-info" role="status">Todavía no es beneficiario del transporte. No aparece en la app móvil hasta que lo des de alta.</div>
        )}

        <dl className="ad-dl">
          <div><dt>DNI</dt><dd className="ad-num">{maskDni(a.dni_alumno) || "—"}</dd></div>
          <div><dt>Alta como beneficiario</dt><dd>{b?.enrolled_at ? fecha(b.enrolled_at) : "—"}</dd></div>
        </dl>
      </section>

      <section className="ad-card ad-pad" aria-labelledby="padron">
        <div>
          <h2 id="padron" className="ad-h2">Datos del padrón</h2>
          <p className="ad-muted">Vienen del padrón municipal. Solo lectura: no se editan desde aquí.</p>
        </div>
        <dl className="ad-dl">
          <div><dt>Colegio</dt><dd>{a.colegio ?? "—"}</dd></div>
          <div><dt>Nivel</dt><dd>{a.nivel_educativo ? cap(a.nivel_educativo) : "—"}</dd></div>
          <div><dt>Edad</dt><dd>{a.edad != null ? `${a.edad} años` : "—"}</dd></div>
          <div><dt>Sexo</dt><dd>{a.sexo ?? "—"}</dd></div>
          <div className="wide"><dt>Dirección</dt><dd>{a.direccion ?? "—"}</dd></div>
          <div className="wide">
            <dt>Apoderado registrado en el padrón</dt>
            <dd>{a.nombre_apoderado ? `${a.nombre_apoderado}${a.telefono_apoderado ? ` · ${maskPhone(a.telefono_apoderado)}` : ""}` : "—"}</dd>
          </div>
          <div className="wide"><dt>Notas</dt><dd className={a.notas ? undefined : "ad-muted"}>{a.notas || "Sin notas"}</dd></div>
        </dl>
      </section>

      <section className="ad-card ad-pad" aria-labelledby="apo">
        <div className="ad-head">
          <h2 id="apo" className="ad-h2">Apoderados</h2>
          <Link className="ad-link" href="/apoderados">Administrar en Apoderados</Link>
        </div>
        {apoderados.length === 0 ? (
          <p className="ad-muted">Este alumno no tiene apoderados vinculados.</p>
        ) : (
          <ul className="ad-list">
            {apoderados.map((v) => (
              <li key={v.id}>
                <div className="ad-stack tight">
                  <span className="ad-strong">
                    {v.g!.full_name} {v.is_primary && <span className="ad-tag solid">Principal</span>}
                  </span>
                  <span className="ad-muted">{cap(v.relationship)}{v.g!.phone ? ` · ${maskPhone(v.g!.phone)}` : ""}</span>
                </div>
                {!v.g!.is_active ? <span className="ad-tag neutral">Desactivado</span> : v.g!.auth_user_id ? <span className="ad-tag ok">Con cuenta en la app</span> : <span className="ad-tag neutral">Sin cuenta</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ad-card ad-pad" aria-labelledby="car">
        <div className="ad-head">
          <h2 id="car" className="ad-h2">Carnet QR</h2>
          <Link className="ad-link" href={`/qr/${a.id}`}>Ir a Carnets QR</Link>
        </div>
        {c ? (
          <div className="ad-tags big">
            <CarnetTag carnet={c} />
            <span>Código <strong className="ad-num">{c.code}</strong></span>
            <span className="ad-muted">Emitido el {fecha(c.issued_at)}</span>
          </div>
        ) : (
          <p className="ad-muted">Sin carnet vigente.</p>
        )}
        {!a.codigo && <div className="ad-warn" role="status">Este alumno no tiene código en el padrón: no se puede emitir su carnet hasta que el padrón lo tenga.</div>}
        <p className="ad-muted">El carnet vence cada año. Si el alumno lo pierde, se vuelve a imprimir desde Carnets QR.{c && estadoCarnet(c) === "vencido" ? ` Este carnet es de ${anioCarnet(c.issued_at)}: hay que emitir uno nuevo.` : ""}</p>
      </section>
    </div>
  );
}
