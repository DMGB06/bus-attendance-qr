"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearApoderado, editarApoderado, type Estado } from "./actions";

export type Datos = { id?: string; full_name?: string; dni?: string | null; phone?: string | null; email?: string | null; notes?: string | null };

// Mismo formulario para crear y para editar. Al crear, la acción redirige a la ficha del apoderado nuevo.
export function FormApoderado({ datos, boton, claseBoton = "primary" }: { datos?: Datos; boton: string; claseBoton?: string }) {
  const editar = !!datos?.id;
  const dialog = useRef<HTMLDialogElement>(null);
  const [estado, action, pendiente] = useActionState<Estado, FormData>(editar ? editarApoderado : crearApoderado, undefined);
  useEffect(() => {
    if (estado?.ok) dialog.current?.close();
  }, [estado]);
  const malTelefono = !!estado?.error && /tel[eé]fono/i.test(estado.error);
  // Tras un error se conserva lo escrito (React 19 vacía los campos sin control al terminar la acción).
  const v = (campo: string, inicial?: string | null) => estado?.values?.[campo] ?? inicial ?? "";

  return (
    <>
      <button type="button" className={`ad-btn ${claseBoton}`} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{boton}</button>
      <dialog ref={dialog} className="ad-dlg" aria-labelledby="form-t">
        {/* key: al volver a abrir tras guardar, el formulario toma los datos nuevos */}
        <form key={datos?.id ? `${datos.id}-${datos.full_name}-${datos.phone}-${datos.dni}-${datos.email}-${datos.notes}` : "nuevo"} action={action} className="ad-dlg-body">
          <div>
            <h2 id="form-t">{editar ? "Editar datos" : "Nuevo apoderado"}</h2>
            <p className="ad-muted">Solo el nombre es obligatorio. El correo hace falta para crear su cuenta en la app.</p>
          </div>
          {editar && <input type="hidden" name="guardianId" value={datos!.id} />}
          <div className="ad-field">
            <label htmlFor="ap-nombre">Nombre completo <span className="ad-bad">(obligatorio)</span></label>
            <input id="ap-nombre" name="fullName" className="ad-input" type="text" maxLength={150} autoComplete="off" defaultValue={v("fullName", datos?.full_name)} disabled={pendiente} required />
          </div>
          <div className="ad-two">
            <div className="ad-field">
              <label htmlFor="ap-dni">DNI</label>
              <input id="ap-dni" name="dni" className="ad-input" type="text" inputMode="numeric" maxLength={8} autoComplete="off" defaultValue={v("dni", datos?.dni)} disabled={pendiente} />
              <small className="ad-hint">8 dígitos</small>
            </div>
            <div className="ad-field">
              <label htmlFor="ap-tel">Teléfono</label>
              <input id="ap-tel" name="phone" className="ad-input" type="tel" maxLength={30} autoComplete="off" defaultValue={v("phone", datos?.phone)} aria-invalid={malTelefono ? "true" : "false"} disabled={pendiente} />
              <small className="ad-hint">9 dígitos, sin +51</small>
            </div>
          </div>
          <div className="ad-field">
            <label htmlFor="ap-correo">Correo</label>
            <input id="ap-correo" name="email" className="ad-input" type="email" maxLength={150} autoComplete="off" defaultValue={v("email", datos?.email)} disabled={pendiente} />
          </div>
          <div className="ad-field">
            <label htmlFor="ap-notas">Notas</label>
            <textarea id="ap-notas" name="notes" rows={2} maxLength={500} defaultValue={v("notes", datos?.notes)} disabled={pendiente} />
          </div>
          {estado?.error && <p className="ad-error" role="alert">{estado.error}</p>}
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()} disabled={pendiente}>Cancelar</button>
            <button type="submit" className="ad-btn primary" disabled={pendiente}>{pendiente ? "Guardando" : "Guardar"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
