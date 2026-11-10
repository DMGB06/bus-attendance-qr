# guardian-account

Crea y gestiona la cuenta de login de un apoderado (padre) para la app móvil. La llama el panel web con la sesión del administrador. Es el único lugar con `service_role`; el panel web nunca lo tiene.

## Quién puede llamarla
Solo el administrador web: sesión válida, MFA completo (`aal2`) y `buscontrol.is_web_admin()`. Cualquier otro (sin sesión, sin MFA, padre, chofer) recibe 401 o 403.

## Pedido
`POST /functions/v1/guardian-account` con `Authorization: Bearer <access token del administrador>` y cuerpo `{ "action": "...", "guardian_id": "<uuid>" }`.

| action | Qué hace | Respuesta 200 |
|---|---|---|
| `create` | Crea el usuario (correo del apoderado, sin enviar correo), fija `app_profiles` como `padre` activo y liga `bus_guardians.auth_user_id` | `{ email, temporary_password }` |
| `reset_password` | Genera otra contraseña temporal | `{ email, temporary_password }` |
| `deactivate` | Perfil inactivo y login bloqueado (`ban_duration`); no se puede ni renovar la sesión abierta | `{ ok: true }`, o `{ ok: true, sin_cambios: true }` si ya estaba bloqueada (no se audita) |
| `reactivate` | Quita el bloqueo y reactiva el perfil | `{ ok: true }`, o `{ ok: true, sin_cambios: true }` si ya estaba activa (no se audita) |

Errores: 400 solicitud inválida, 401 sin sesión, 403 no autorizado o sin MFA, 404 apoderado inexistente, 409 ya tiene cuenta / no tiene cuenta / correo no disponible (mensaje único, no revela si el correo existe), 422 apoderado sin correo o desactivado.

## Reglas
- La contraseña temporal (16 caracteres, minúscula, mayúscula y dígito) se muestra una sola vez. No se guarda ni se registra en la auditoría. El administrador se la entrega al padre; no se envía ningún correo.
- No se cierran las sesiones abiertas con `signOut` (pide el JWT del usuario). El corte inmediato lo da `bus_guardians.is_active = false` (lo exigen las políticas del móvil, ver `set_guardian_active`) y el bloqueo de la cuenta impide volver a entrar o renovar.
- Si algo falla después de crear el usuario, se borra el usuario y su perfil.
- Auditoría: `guardian_account_link` (crear) en `link_guardian_account`; `reset_password`, `deactivate` y `reactivate` en `log_guardian_account_action` (migración 032).

## Probar (solo Supabase local)
1. `supabase start`, aplicar las migraciones de `supabase/pending/` hasta la 032, y tener `web/.env.test.local` con el administrador de pruebas.
2. `supabase functions serve guardian-account` en una terminal.
3. `node --test supabase/functions/guardian-account/lib/password.test.ts` (contraseñas).
4. `node supabase/functions/guardian-account/test.mjs` (16 pruebas de integración; limpia lo que crea).

## Despliegue
`supabase functions deploy guardian-account` (producción, con el proyecto enlazado). Las claves `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase; no se agrega ningún secreto a mano. Requiere la migración 032 aplicada antes. En producción verificar si `auth.users` tiene el trigger de `handle_new_app_user` (la función hace upsert del perfil, funciona con o sin él).
