"use client";

import { useActionState, useState } from "react";
import Script from "next/script";
import { signIn } from "./actions";
import { Alert, Notice, SubmitButton } from "./shell";

type Props = { next: string; email: string; siteKey?: string; nonce?: string; expired: boolean };

export function LoginForm({ next, email, siteKey, nonce, expired }: Props) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const bad = state?.error ? "true" : "false";

  return (
    <form className="panel" action={action} noValidate>
      {state?.error ? <Alert>{state.error}</Alert> : expired && <Notice>Tu sesión se cerró por seguridad. Vuelve a ingresar.</Notice>}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Correo</label>
        <div className="control">
          <svg className="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></svg>
          <input id="email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required defaultValue={state?.email ?? email} aria-invalid={bad} disabled={pending} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div className="control has-action">
          <svg className="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required aria-invalid={bad} disabled={pending} />
          <button className="reveal" type="button" aria-pressed={show} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShow(!show)}>
            {show ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7M6.6 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4.2-1" /><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>
            )}
          </button>
        </div>
      </div>
      <div className="row">
        <label className="check" htmlFor="remember"><input id="remember" name="remember" type="checkbox" defaultChecked={!!email} /> Recordar mi correo</label>
        <button className="link" type="button" aria-expanded={forgot} onClick={() => setForgot(!forgot)}>Olvidé mi contraseña</button>
      </div>
      {/* Sin envio de correo (no hay SMTP): la contrasena del administrador se restablece desde sistemas. Decision del 9/11/26. */}
      {forgot && <p className="note" role="status">Pide el restablecimiento al área de sistemas de la municipalidad.</p>}
      {siteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" nonce={nonce} strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={siteKey} data-language="es" />
        </>
      )}
      <SubmitButton pending={pending} label="Ingresar" pendingLabel="Ingresando" />
    </form>
  );
}
