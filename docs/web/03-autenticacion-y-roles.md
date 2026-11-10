# Autenticación y roles

## Proveedor de autenticación
Se utiliza Supabase Auth, el mismo proyecto que ya usa la aplicación móvil. No se crea un sistema de autenticación propio.

## Rol de usuario
Se agrega un nuevo valor de rol llamado `administrador` en el campo `app_role` de la tabla `app_profiles`. Este rol es distinto de chofer, asistenta, padre y coordinador.

## Sesión en Next.js
Se utiliza la librería `@supabase/ssr` para manejar la sesión. El login se hace solo por Server Action (sin cliente de navegador), con cookies HttpOnly, Secure y SameSite, para que el token nunca esté en JavaScript. Confirmar las opciones reales de cookie al instalar la librería.

## Protección de rutas
Todas las rutas del sistema web están protegidas por `proxy.ts` (Next 16), que redirige al login si no hay sesión. Eso no basta: cada página y Server Action vuelve a llamar `getUser()` (no `getSession()`) y `is_web_admin()`. Cualquier otro rol o usuario no autenticado es rechazado. La barrera final es la base de datos (RLS y funciones).

## Seguridad del login (decisiones 8 a 10, aprobadas)
Base obligatoria:
- Sin SQL concatenado en funciones. `supabase-js` y los RPC usan parámetros.
- XSS: React escapa por defecto, prohibido `dangerouslySetInnerHTML`, CSP con nonce en `proxy.ts`.
- Entradas validadas con `zod` en el servidor antes de llamar a Supabase.
- CSRF: verificación de Origin de las Server Actions más SameSite.
- Fuerza bruta: rate limit de Supabase Auth por IP más CAPTCHA tras fallos.
- Mensaje único "credenciales inválidas": no revelar si el correo existe.
- Contraseña de mínimo 12 caracteres. La web no permite crear cuentas.
- Headers: HSTS, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy.
- Validar el parámetro `next` del login (open redirect).
- En `web/` solo URL y anon key. `service_role` jamás.
- Registrar logins fallidos y exitosos del administrador.

Decisiones:
- 8: MFA con TOTP para el administrador (SI). Riesgo: si pierde el factor, la recuperación es manual con privilegios de servicio.
- 9: CAPTCHA (Cloudflare Turnstile) tras fallos (SI).
- 10: bloqueo propio por cuenta o IP (NO al inicio; se agrega si aparecen ataques).

Verificado:
- El móvil solo usa `signInWithPassword` (no `signUp`). El registro se apagó con `[auth] enable_signup = false`. NO tocar `[auth.email] enable_signup`: en el CLI apaga todo el login por correo.
- Límite configurable: `sign_in_sign_ups` (intentos por IP cada 5 min, hoy 30) y `token_verifications` (códigos MFA). En producción se ajusta en el panel de Supabase (Auth > Rate Limits).
- Turnstile de Supabase es siempre activo (pide token en cada intento), no "tras fallos". El código pasa el token si existe `TURNSTILE_SITE_KEY`; decidir en la Etapa 6.
- Los intentos fallidos quedan en los logs de Supabase Auth; `admin_audit_log` registra `session_login` (tras MFA) y `session_logout` (migración 031).

Implementación (Etapa 3, `web/`): `lib/supabase.ts` (cliente con cookies HttpOnly), `lib/auth.ts` (`requireAdmin()`: `getUser()`, `is_web_admin()` y AAL2; `safeNext()`), `proxy.ts` (CSP con nonce, refresco de sesión, redirección), `app/login` (acciones, formulario, MFA). Config local: contraseña mínima 12, TOTP activo. En producción hay que replicar esos ajustes en el panel antes del deploy.

## Expiración de la sesión
El token de acceso dura 1 hora y se renueva solo. Sobre eso, `proxy.ts` cierra la sesión tras 20 minutos sin pedidos al servidor (cookie `cb-activity`) y la revoca en Supabase (`signOut` local, el token deja de servir) o 8 horas desde el último ingreso (`amr` del JWT, firmado). Después lleva a `/login?sesion=expirada`. Los valores están en `web/lib/session-limits.ts`. No depende de `[auth.sessions]` de Supabase, que en producción requiere plan pago. El cierre por vencimiento no se registra en `admin_audit_log`.

## Recuperación de cuenta
Cuentas de padres: reinicio manual por el administrador (R-C4). No se envía correo: no hay SMTP. Desde la ficha del apoderado el administrador genera una contraseña temporal, que se muestra una sola vez y se entrega en persona. Lo hace la Edge Function `guardian-account`, que exige sesión con MFA completo (aal2) e `is_web_admin()`. Para desactivar una cuenta se bloquea el inicio de sesión (`ban_duration`), y reactivar lo devuelve. No se obliga al padre a cambiar la contraseña.

Cuenta del administrador: no hay flujo de recuperación en la web. Ver el riesgo 1 en `07-riesgos-abiertos.md`.

## Cantidad de administradores
Inicialmente solo existe un usuario con rol `administrador`.
