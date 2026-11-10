"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { darDeAlta, darDeBaja, type AccionEstado } from "../actions";
import type { EstadoAlumno } from "@/lib/schemas/alumnos";

const MAX = 200;

export function AccionesAlumno({ studentId, nombre, estado }: { studentId: string; nombre: string; estado: EstadoAlumno }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [baja, bajaAction, bajando] = useActionState<AccionEstado, FormData>(darDeBaja, undefined);
  const [alta, altaAction, altando] = useActionState<AccionEstado, FormData>(darDeAlta, undefined);
  const [motivo, setMotivo] = useState("");

  // La baja salió bien: cerrar el diálogo (onClose limpia el motivo). La página se vuelve a pintar sola.
  useEffect(() => {
    if (baja?.ok) dialog.current?.close();
  }, [baja]);

  if (estado !== "beneficiario") {
    return (
      <form action={altaAction} className="ad-inline">
        <input type="hidden" name="studentId" value={studentId} />
        <button className="ad-btn primary" type="submit" disabled={altando}>
          {altando ? "Guardando" : estado === "baja" ? "Reactivar" : "Dar de alta"}
        </button>
        {alta?.error && <p className="ad-error" role="alert">{alta.error}</p>}
      </form>
    );
  }

  return (
    <>
      <button type="button" className="ad-btn danger-outline" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        Dar de baja
      </button>
      <dialog ref={dialog} className="ad-dlg narrow" aria-labelledby="baja-t" onClose={() => setMotivo("")}>
        <form action={bajaAction} className="ad-dlg-body">
          <div>
            <h2 id="baja-t">Dar de baja a {nombre}</h2>
            <p className="ad-muted">
              El alumno dejará de aparecer en la app móvil y no podrá registrar asistencia. Su historial y su carnet se conservan. Podrás reactivarlo cuando quieras.
            </p>
          </div>
          <input type="hidden" name="studentId" value={studentId} />
          <div className="ad-field">
            <label htmlFor="motivo">
              Motivo de la baja <span className="ad-bad">(obligatorio)</span>
            </label>
            <textarea
              id="motivo"
              name="motivo"
              rows={4}
              maxLength={MAX}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-describedby="motivo-ayuda"
              aria-invalid={baja?.error ? "true" : "false"}
              disabled={bajando}
            />
            <div className="ad-field-foot">
              <span id="motivo-ayuda">Por ejemplo: cambio de colegio, se mudó, ya no usa el servicio.</span>
              <span className="ad-num">{motivo.length}/{MAX}</span>
            </div>
            {baja?.error && <p className="ad-error" role="alert">{baja.error}</p>}
          </div>
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()} disabled={bajando}>Cancelar</button>
            <button type="submit" className="ad-btn danger" disabled={bajando}>{bajando ? "Guardando" : "Dar de baja"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
