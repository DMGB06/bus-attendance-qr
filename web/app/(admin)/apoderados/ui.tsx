"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import type { Estado } from "./actions";

type Accion = (prev: Estado, form: FormData) => Promise<Estado>;

// Botón que pide confirmación en un diálogo antes de ejecutar una acción del servidor.
export function ConfirmAccion({
  accion, campos, boton, titulo, mensaje, confirmar, peligro = true, claseBoton = "danger-outline",
}: {
  accion: Accion; campos: Record<string, string>; boton: string; titulo: string; mensaje: string; confirmar: string; peligro?: boolean; claseBoton?: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [estado, action, pendiente] = useActionState<Estado, FormData>(accion, undefined);
  useEffect(() => {
    if (estado?.ok) dialog.current?.close();
  }, [estado]);
  return (
    <>
      <button type="button" className={`ad-btn ${claseBoton}`} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{boton}</button>
      <dialog ref={dialog} className="ad-dlg narrow" aria-labelledby={id}>
        <form action={action} className="ad-dlg-body">
          <div>
            <h2 id={id}>{titulo}</h2>
            <p className="ad-muted">{mensaje}</p>
          </div>
          {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          {estado?.error && <p className="ad-error" role="alert">{estado.error}</p>}
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()} disabled={pendiente}>Cancelar</button>
            <button type="submit" className={`ad-btn ${peligro ? "danger" : "primary"}`} disabled={pendiente}>{pendiente ? "Guardando" : confirmar}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Botón de un solo paso (sin diálogo) que muestra el error si falla.
export function FormBoton({ accion, campos, texto, clase = "outline" }: { accion: Accion; campos: Record<string, string>; texto: string; clase?: string }) {
  const [estado, action, pendiente] = useActionState<Estado, FormData>(accion, undefined);
  return (
    <form action={action} className="ad-inline">
      {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={`ad-btn ${clase}`} disabled={pendiente}>{pendiente ? "Guardando" : texto}</button>
      {estado?.error && <p className="ad-error" role="alert">{estado.error}</p>}
    </form>
  );
}
