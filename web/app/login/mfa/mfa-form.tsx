"use client";

import { useActionState } from "react";
import { backToLogin, startEnroll, verifyCode } from "../actions";
import { Alert, SubmitButton } from "../shell";

export function MfaForm({ next, enrolled }: { next: string; enrolled: boolean }) {
  const [setup, enroll, enrolling] = useActionState(startEnroll, undefined);
  const [state, verify, verifying] = useActionState(verifyCode, undefined);

  if (!enrolled && !setup?.qr) {
    return (
      <form className="panel" action={enroll}>
        <div className="head">
          <h2>Activa la verificación en dos pasos</h2>
          <p>Es obligatoria para el administrador. Necesitas una aplicación de autenticación en tu celular, como Google Authenticator o Microsoft Authenticator.</p>
        </div>
        {setup?.error && <Alert>{setup.error}</Alert>}
        <SubmitButton pending={enrolling} label="Configurar" pendingLabel="Preparando" />
        <button className="link center" type="submit" formAction={backToLogin}>Volver</button>
      </form>
    );
  }

  return (
    <form className="panel" action={verify} noValidate>
      <div className="head">
        <h2>Verificación en dos pasos</h2>
        <p>{setup?.qr ? "Escanea el código con tu aplicación de autenticación y escribe los 6 dígitos que muestra." : "Ingresa el código de 6 dígitos de tu aplicación de autenticación."}</p>
      </div>
      {setup?.qr && (
        <div className="qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="Código QR para la aplicación de autenticación" />
          <code>{setup.secret}</code>
        </div>
      )}
      {state?.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="code">Código</label>
        <div className="control code">
          <input id="code" name="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" required autoFocus aria-invalid={state?.error ? "true" : "false"} disabled={verifying}
            onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 6); }} />
        </div>
      </div>
      <SubmitButton pending={verifying} label="Verificar" pendingLabel="Verificando" />
      <button className="link center" type="submit" formAction={backToLogin} formNoValidate>Volver</button>
    </form>
  );
}
