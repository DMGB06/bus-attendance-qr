# Errores conocidos — Sistema web BusControl

## El middleware se llama `proxy.ts`, no `middleware.ts`
- **Pasa cuando:** se usa Next.js 16 (versión instalada en `web/`).
- **Causa real:** en Next 15 el archivo es `middleware.ts`; en 16+ es `proxy.ts`. Con el nombre equivocado no corre.
- **Solución:** usar `proxy.ts` en Next 16.4.5. Leer `node_modules/next/dist/docs/` antes de escribir código (lo exige `web/AGENTS.md`).

## `createClient()` durante SSR rompe el prerenderizado estático
- **Pasa cuando:** se llama `createClient()` en el ámbito de módulo de una página de login.
- **Causa real:** `cookies()` es async en Next.js 15/16 y no está disponible durante el prerenderizado en servidor.
- **Solución:** mover `createClient()` a `useEffect` con `useState<any>(null)` y null guard, para que solo inicialice en cliente.

## Errores `implicit any` en filas de `qr_codes`
- **Pasa cuando:** se usa `.filter` o `.map` sobre `qr_codes` sin anotación de tipo.
- **Causa real:** `qr_codes` no está en `public.Tables` (está en schema `buscontrol`), por lo que TypeScript no infiere el tipo.
- **Solución:** tipar explícitamente, ej: `.filter((row: { status: string }) => ...)` o `.map((row: { id: string; student_id: string; ... }) => ...)`. Para la consulta en sí usar `(supabase as any).from("qr_codes")` con tipado manual de las filas.

## Las funciones RPC están en schema `buscontrol`, no en `public`
- **Pasa cuando:** se intenta llamar `supabase.rpc("issue_qr_card", ...)` sin cast.
- **Causa real:** el cliente de Supabase tipa funciones en `public` por defecto.
- **Solución:** usar `(supabase as any).rpc("issue_qr_card", ...)`.

## Un carnet "perdido" sigue validando en el móvil
- **Pasa cuando:** se reporta un carnet como perdido desde la web.
- **Causa real:** el móvil solo consulta el padrón `social_bus_escolar`, no la tabla `qr_codes`.
- **Solución:** aceptar como limitación conocida; la revocación real requiere cambiar la app móvil (opción futura).

## Solo un administrador, sin respaldo de recuperación
- **Pasa cuando:** el administrador olvida la contraseña o deja la municipalidad.
- **Causa real:** solo se puede asignar el rol `administrador` manualmente con privilegios de servicio en Supabase.
- **Solución:** documentación del paso manual; mejora futura: segundo administrador o flujo de recuperación.

## Migraciones 025–030: aplicadas en producción el 2026-11-07
- **Producción:** aplicadas en orden con respaldo previo (`respaldos-sigem`, fuera del repo) y verificadas una a una: enum con 5 valores, tablas con RLS, funciones sin acceso para `anon`, políticas del padrón intactas y datos sin cambios. Todavía no hay ningún administrador asignado.
- **Estado previo (Docker):** ensayadas en Docker local (esquema real de producción, sin datos) con un usuario por rol, anon y rollback: `supabase/tests/etapa1_roles.sql`, `etapa1_extra.sql`, `etapa2_beneficiarios.sql` y `etapa2_apoderados.sql`. Falta la prueba de concurrencia de emisión y un ensayo con datos reales.
- **Cómo repetirlo:** `supabase start`; las migraciones 0000-0002 (esquema base) y 025 se aplican solas; aplicar `supabase/pending/026`, `027`, `028` y `029` a mano con `docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < archivo.sql`; correr los scripts de pruebas.
- **Antes de producción:** respaldo y aviso a TI SIGEM por la 027.

## Apoderado con duplicados o sin datos de contacto
- **Pasa cuando:** el padrón o el catálogo de apoderados ya tiene DNI o teléfono repetidos, o un apoderado no tiene teléfono.
- **Causa real:** `bus_guardians` no tiene índice único por DNI, y el único por teléfono normalizado solo aplica si el teléfono existe. Los datos reales no se han revisado.
- **Solución:** correr `supabase/tests/check_duplicados_apoderados.sql` en producción (solo lectura) antes de cualquier índice UNIQUE; el apoderado sin teléfono se acepta.

## Código de alumno nulo o cambiante en el padrón
- **Pasa cuando:** se usa `codigo` como llave o como búsqueda única.
- **Causa real:** `codigo` puede ser NULL o cambiar en el padrón.
- **Solución:** usar `student_id` (`id` del padrón) como llave; mostrar y buscar el código solo como etiqueta.

## Carnet desactualizado tras baja o reemplazo
- **Pasa cuando:** un alumno dado de baja sigue con carnet vigente en la web.
- **Causa real:** la baja no cierra el carnet; el móvil solo consulta el padrón, no `qr_codes`.
- **Solución:** aceptar como limitación conocida; la baja corta el beneficio en la web, no el escaneo del móvil.

## Acceso anónimo no revocado en tablas nuevas
- **Pasa cuando:** se crea una tabla nueva sin revocar explícitamente el acceso al rol `anon`.
- **Causa real:** la revocación anterior solo aplica a tablas existentes en ese momento.
- **Solución:** incluir `REVOKE` explícito a `anon`/`public` dentro de cada migración nueva.

## El primer administrador no puede crearse desde la web
- **Pasa cuando:** se intenta autoasignar el rol `administrador` desde la aplicación.
- **Causa real:** `app_profiles` no tiene política de UPDATE para `authenticated`, así que el intento afecta 0 filas sin error (probado en Docker local). El trigger `trg_protect_app_profile` es una segunda barrera.
- **Solución:** crear manualmente desde el panel de Supabase con privilegios de servicio.
