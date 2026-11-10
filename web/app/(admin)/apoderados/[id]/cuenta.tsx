"use client";

import { useRef, useState, useTransition } from "react";
import { bloquearCuenta, crearCuenta, desbloquearCuenta, reiniciarClave, type Reveal } from "../actions";
import { ConfirmAccion, FormBoton } from "../ui";

type Props = { guardianId: string; nombre: string; email: string | null; tieneCuenta: boolean; cuentaActiva: boolean | null; apoderadoActivo: boolean };

// La contraseña temporal vive solo en la memoria de este componente: no se guarda en la URL ni en el servidor,
// y desaparece al cerrar el diálogo o recargar la página.
export function CuentaApp({ guardianId, nombre, email, tieneCuenta, cuentaActiva, apoderadoActivo }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [clave, setClave] = useState<{ email: string; password: string; creada: boolean } | null>(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [pendiente, start] = useTransition();

  const pedir = (accion: (id: string) => Promise<Reveal>, creada: boolean) => {
    setError("");
    start(async () => {
      const r = await accion(guardianId);
      if (!r.ok) return setError(r.error);
      setCopiado(false);
      setClave({ email: r.email, password: r.password, creada });
      dialog.current?.showModal();
    });
  };
  const cerrar = () => {
    dialog.current?.close();
    setClave(null);
  };

  return (
    <section className="ad-card ad-pad" aria-labelledby="cta">
      <div>
        <h2 id="cta" className="ad-h2">Cuenta en la app</h2>
        <p className="ad-muted">Con la cuenta, el padre ve a sus hijos en la app móvil. No se envía ningún correo: tú le entregas la contraseña en persona.</p>
      </div>

      {!tieneCuenta && (
        <>
          <div className="ad-head">
            <div className="ad-stack tight">
              <span className="ad-tag neutral">Sin cuenta</span>
              <span>{email ? <>Usará el correo <strong>{email}</strong> para iniciar sesión.</> : "Falta el correo del apoderado."}</span>
            </div>
            <button type="button" className="ad-btn primary" onClick={() => pedir(crearCuenta, true)} disabled={pendiente || !email || !apoderadoActivo}>
              {pendiente ? "Creando" : "Crear cuenta"}
            </button>
          </div>
          {!email && <p className="ad-warn">Primero agrega un correo en &quot;Editar datos&quot;: la cuenta inicia sesión con ese correo.</p>}
          {!apoderadoActivo && <p className="ad-warn">El apoderado está desactivado: reactívalo para crearle una cuenta.</p>}
        </>
      )}

      {tieneCuenta && cuentaActiva !== false && (
        <div className="ad-head">
          <div className="ad-stack tight">
            <span className="ad-tag ok">Con cuenta</span>
            <span>Inicia sesión con <strong>{email}</strong></span>
          </div>
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => pedir(reiniciarClave, false)} disabled={pendiente}>{pendiente ? "Generando" : "Reiniciar contraseña"}</button>
            <ConfirmAccion
              accion={bloquearCuenta} campos={{ guardianId }} boton="Bloquear cuenta" titulo={`Bloquear la cuenta de ${nombre}`}
              mensaje="No podrá iniciar sesión ni renovar su sesión en la app. Sus datos y vínculos se conservan. Puedes desbloquearla cuando quieras." confirmar="Bloquear cuenta"
            />
          </div>
        </div>
      )}

      {tieneCuenta && cuentaActiva === false && (
        <div className="ad-head">
          <div className="ad-stack tight">
            <span className="ad-tag neutral">Cuenta bloqueada</span>
            <span>{apoderadoActivo ? "El padre no puede iniciar sesión." : "Se desbloquea al reactivar al apoderado."}</span>
          </div>
          {apoderadoActivo && <FormBoton accion={desbloquearCuenta} campos={{ guardianId }} texto="Desbloquear cuenta" clase="primary" />}
        </div>
      )}

      {error && <p className="ad-error" role="alert">{error}</p>}

      <dialog ref={dialog} className="ad-dlg" aria-labelledby="clave-t" aria-describedby="clave-d" onClose={() => setClave(null)}>
        {clave && (
          <div className="ad-dlg-body">
            <div>
              <h2 id="clave-t">{clave.creada ? `Cuenta creada para ${nombre}` : `Nueva contraseña para ${nombre}`}</h2>
              <p id="clave-d" className="ad-muted">Entrégale estos datos al padre en persona. No se envía ningún correo.</p>
            </div>
            <dl className="ad-secret">
              <div><dt>Correo para iniciar sesión</dt><dd className="ad-strong">{clave.email}</dd></div>
              <div>
                <dt>Contraseña temporal</dt>
                <dd className="ad-secret-row">
                  <code className="ad-code" data-testid="clave-temporal">{clave.password}</code>
                  <button type="button" className="ad-btn outline" onClick={() => navigator.clipboard?.writeText(clave.password).then(() => setCopiado(true), () => setCopiado(false))}>
                    {copiado ? "Copiada" : "Copiar"}
                  </button>
                </dd>
              </div>
            </dl>
            <p className="ad-warn" role="note">Esta contraseña se muestra una sola vez. Al cerrar esta ventana no se puede volver a ver. Si se pierde, reinicia la contraseña desde la ficha.</p>
            <p className="ad-muted">Recomiéndale al padre cambiarla desde la app en su primer ingreso. No es obligatorio.</p>
            <div className="ad-actions">
              <button type="button" className="ad-btn primary" onClick={cerrar}>Ya anoté la contraseña</button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
