import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { maskDni, maskPhone } from "@/lib/mask";
import { idSchema } from "@/lib/schemas/apoderados";
import { desactivar, desvincular, marcarPrincipal, reactivar } from "../actions";
import { FormApoderado } from "../form-apoderado";
import { ConfirmAccion, FormBoton } from "../ui";
import { CuentaApp } from "./cuenta";
import { VincularAlumno } from "./vincular";

type Detalle = {
  guardian: { id: string; full_name: string; phone: string | null; dni: string | null; email: string | null; notes: string | null; is_active: boolean; has_account: boolean };
  account_active: boolean | null;
  students: { student_id: string; nombre: string; codigo: string | null; relationship: string; is_primary: boolean; primary_name: string | null }[];
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default async function FichaApoderado({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { data, error } = await supabase.rpc("admin_guardian_detail", { p_guardian_id: id });
  if (error) {
    if (/no encontrado/i.test(error.message)) notFound();
    throw new Error("No se pudo cargar el apoderado.");
  }
  const d = data as Detalle;
  const g = d.guardian;

  return (
    <div className="ad-stack narrow-page">
      <nav aria-label="Ruta" className="ad-crumbs">
        <Link href="/apoderados">Apoderados</Link> <span aria-hidden="true">/</span> <span>{g.full_name}</span>
      </nav>

      <section className="ad-card ad-pad" aria-labelledby="nombre">
        <div className="ad-head">
          <div className="ad-stack tight">
            <h2 id="nombre" className="ad-title">{g.full_name}</h2>
            <div className="ad-tags">{g.is_active ? <span className="ad-tag ok">Activo</span> : <span className="ad-tag neutral">Desactivado</span>}</div>
          </div>
          <div className="ad-actions">
            <FormApoderado boton="Editar datos" claseBoton="outline" datos={{ id: g.id, full_name: g.full_name, dni: g.dni, phone: g.phone, email: g.email, notes: g.notes }} />
            {g.is_active ? (
              <ConfirmAccion
                accion={desactivar} campos={{ guardianId: g.id }} boton="Desactivar" titulo={`Desactivar a ${g.full_name}`}
                mensaje="Dejará de ver a sus hijos en la app y, si tiene cuenta, no podrá iniciar sesión. Sus datos y vínculos se conservan. Puedes reactivarlo cuando quieras." confirmar="Desactivar"
              />
            ) : (
              <FormBoton accion={reactivar} campos={{ guardianId: g.id }} texto="Reactivar" clase="primary" />
            )}
          </div>
        </div>

        {!g.is_active && (
          <div className="ad-info" role="status">Este apoderado está desactivado: no ve a sus hijos en la app y no puede iniciar sesión. Al reactivarlo recupera el acceso con la misma contraseña.</div>
        )}

        <dl className="ad-dl">
          <div><dt>DNI</dt><dd className="ad-num">{maskDni(g.dni) || "—"}</dd></div>
          <div><dt>Teléfono</dt><dd className="ad-num">{maskPhone(g.phone) || "—"}</dd></div>
          <div><dt>Correo</dt><dd>{g.email ?? "—"}</dd></div>
          <div className="wide"><dt>Notas</dt><dd className={g.notes ? undefined : "ad-muted"}>{g.notes || "Sin notas"}</dd></div>
        </dl>
      </section>

      <CuentaApp
        guardianId={g.id} nombre={g.full_name} email={g.email} tieneCuenta={g.has_account}
        cuentaActiva={d.account_active} apoderadoActivo={g.is_active}
      />

      <section className="ad-card ad-pad" aria-labelledby="alu">
        <div className="ad-head">
          <h2 id="alu" className="ad-h2">Alumnos vinculados</h2>
          {g.is_active && <VincularAlumno guardianId={g.id} nombre={g.full_name} />}
        </div>
        {d.students.length === 0 ? (
          <p className="ad-muted">Este apoderado no tiene alumnos vinculados.</p>
        ) : (
          <ul className="ad-list">
            {d.students.map((s) => (
              <li key={s.student_id}>
                <div className="ad-stack tight">
                  <span className="ad-strong">
                    <Link className="ad-rowlink" href={`/alumnos/${s.student_id}`}>{s.nombre}</Link> {s.is_primary && <span className="ad-tag solid">Principal</span>}
                  </span>
                  <span className="ad-muted">
                    {cap(s.relationship)} · {s.codigo ? `CÓDIGO ${s.codigo}` : "Sin código"}
                    {!s.is_primary && s.primary_name ? ` · el principal es ${s.primary_name}` : ""}
                  </span>
                </div>
                <div className="ad-actions">
                  {!s.is_primary && <FormBoton accion={marcarPrincipal} campos={{ guardianId: g.id, studentId: s.student_id }} texto="Marcar como principal" />}
                  <ConfirmAccion
                    accion={desvincular} campos={{ guardianId: g.id, studentId: s.student_id }} boton="Desvincular" titulo={`Desvincular a ${s.nombre}`}
                    mensaje={`${g.full_name} dejará de ser apoderado de este alumno y ya no lo verá en la app.`} confirmar="Desvincular"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="ad-note">Cada alumno tiene un solo apoderado principal. Al marcar uno nuevo, el anterior deja de serlo.</p>
      </section>
    </div>
  );
}
