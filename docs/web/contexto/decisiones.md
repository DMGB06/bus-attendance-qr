# Decisiones tomadas — Sistema web BusControl

> Una entrada por decisión. Lo importante es el "por qué" y el "qué descartamos".

## 7/11/26 · Corte del primer release (MVP vs futuro)
- **Decisión:** Release 1 incluye acceso, carnets QR, alumnos beneficiarios, apoderados, dashboard mínimo y auditoría. Release 2 incluye buses, tripulación y consultas operativas.
- **Por qué:** el QR es el requerimiento más urgente; alumnos y apoderados son el contexto que necesita.
- **Descartado:** todo en un solo release sin fases (el usuario pidió "todo de una vez" pero se acordó un orden interno de construcción).
- **Estado:** vigente

## 7/11/26 · Versión de Next.js
- **Decisión:** Next.js 16.4.5 (ya instalado en `web/`).
- **Por qué:** el proyecto `web/` ya está instalado con esta versión.
- **Descartado:** Next.js 15 (middleware se llama `proxy.ts` en 16, no `middleware.ts`).
- **Estado:** vigente

## 7/11/26 · Librerías PDF y QR
- **Decisión:** `qrcode` para PNG del QR y `pdf-lib` para hoja A4 con varios carnets.
- **Por qué:** ligeras, corren sin servidor de fuentes, compatibles con React 19 / Next 16 (a confirmar al instalar).
- **Descartado:** no definido aún; pendiente verificación de compatibilidad al instalar.
- **Estado:** pendiente verificación

## 7/11/26 · Baja de beneficiario
- **Decisión:** baja lógica (soft delete): tabla `bus_beneficiaries` con llave primaria `student_id` (referencia al `id` del padrón `social_bus_escolar`), columnas `is_active`, `enrolled_at`, `enrolled_by`, `deactivated_at`, `deactivated_by`, `deactivated_reason`; funciones `enroll_beneficiary(student_id)` y `deactivate_beneficiary(student_id, reason)` (SECURITY DEFINER, solo administrador, derivan el usuario de `auth.uid()`). La baja no cierra el carnet vigente en `qr_codes`.
- **Por qué:** reversible, preserva historial de viajes y asistencia, no borra datos del alumno.
- **Descartado:** eliminar al alumno de una vez.
- **Estado:** vigente

## 7/11/26 · Diseño del carnet QR
- **Decisión:** replicar el diseño 2026 de `scripts/generar_carnets_qr.py` (mica 95 × 60 mm horizontal, cabecera azul `#152766`, escudo, "MUNICIPALIDAD DE CERRO AZUL / TRANSPORTE ESCOLAR", franja dorada `#FFCC00`, QR grande, nombre en mayúsculas, chip "CÓDIGO BUxxxx", pie "Válido para control de asistencia · año").
- **Por qué:** el carnet de la web y el del script deben ser idénticos.
- **Descartado:** diseño propio nuevo o maqueta HTML alternativa.
- **Estado:** vigente

## 7/11/26 · Skills externas de Supabase
- **Decisión:** instalar `supabase` y `supabase-postgres-best-practices` a nivel de usuario (`~/.claude/skills`), sin tocar el repo.
- **Por qué:** autorizadas por el usuario; guían RLS, auth y mejores prácticas de Postgres.
- **Descartado:** `vercel-deploy` y `fullstack-deploy` (riesgo para sistema municipal con datos de menores).
- **Estado:** vigente

## 7/11/26 · Entorno de pruebas (Docker)
- **Decisión:** El entorno de pruebas es Supabase local en Docker (`supabase start` + `docker exec` para aplicar SQL pendiente y pruebas). Docker 29.4.3 y Compose v5.1.3 están disponibles en el host.
- **Por qué:** permite ensayar las migraciones 025–028 con usuarios por rol sin tocar producción, y el flujo ya está documentado en `supabase/README.md`.
- **Descartado:** proyecto Supabase remoto de pruebas (evita costos y dependencia de red).
- **Estado:** vigente

## 7/11/26 · Tabla de beneficiarios (028)
- **Decisión:** tabla `bus_beneficiaries` con llave primaria `student_id` (llave foránea al `id` del padrón `social_bus_escolar`, no al `codigo`), columnas de alta, baja y reactivación, y constraint que exige motivo al dar de baja. Funciones `enroll_beneficiary(student_id)` (alta o reactivación) y `deactivate_beneficiary(student_id, reason)` (SECURITY DEFINER, solo administrador). El `codigo` (ej. BU0098) solo se muestra, nunca es clave. La baja no cierra el carnet vigente en `qr_codes`.
- **Por qué:** `student_id` es el identificador estable del padrón; el `codigo` puede ser NULL o cambiar. El `codigo` es solo una etiqueta legible para el carnet. Un solo registro por alumno: reactivar reusa la fila, sin historial en la tabla (el historial queda en `admin_audit_log`).
- **Descartado:** usar `codigo` como llave (cambiaría si el padrón lo reasigna o está vacío; obligaría a tocar el móvil); cerrar el carnet al dar de baja (el móvil no consulta `qr_codes`; requeriría cambiar la app móvil); llave `id` propia separada del alumno (agrega un paso más sin beneficio).
- **Estado:** vigente

## 7/11/26 · Apoderados y vínculos (029)
- **Decisión:** el administrador crea, edita y activa/desactiva apoderados, y los vincula a alumnos, solo con funciones SECURITY DEFINER auditadas. Desactivar apoderado = `is_active = false` (corta su acceso en el móvil). Desvincular = borrar la fila en `bus_student_guardians`. Un solo apoderado principal por alumno, impuesto por función. La web no crea usuarios de login (`auth_user_id` queda NULL).
- **Por qué:** desactivar debe cortar el acceso, y el móvil ya filtra por `is_active`. No se agrega columna de estado a `bus_student_guardians` para no cambiar la tabla que usa el móvil.
- **Descartado:** columna `is_active` en `bus_student_guardians` (obliga a tocar funciones del móvil); índice único parcial de principal (puede fallar con datos existentes; revisar antes); crear cuenta de login desde la web (otra etapa, requiere service_role y invitación).
- **Estado:** vigente, pendiente revisar duplicados de DNI y teléfono en datos reales

## 7/11/26 · Dominio
- **Decisión:** solo Vercel, dominio por defecto `*.vercel.app`.
- **Por qué:** simple, rápido, sin coste adicional inmediato.
- **Descartado:** dominio municipal propio (mejora futura).
- **Estado:** vigente

## 7/11/26 · Código del QR (bloqueador de seguridad resuelto)
- **Decisión:** el valor impreso es siempre el `codigo` del padrón municipal; la tabla `qr_codes` es historial de emisiones, no fuente del valor escaneado.
- **Por qué:** la app móvil busca el código en el padrón, no en `qr_codes`; no obliga a cambiar el móvil ni a escribir en el padrón.
- **Descartado:** generar códigos nuevos (requería cambiar la app móvil).
- **Estado:** vigente

## 7/11/26 · Menú del panel (Etapa 4)
- **Decisión:** menú de azul liso (el `--accent` del login, sin degradados), con la pestaña activa fundida al contenido. Escritorio (1024px o más): panel pegado a la izquierda, a toda la altura, de 248px que se contrae a 72px; la elección se guarda en la cookie `cb-menu`. Celular: barra inferior con 4 módulos (Dashboard, Alumnos, Apoderados, Carnets QR) y un botón que abre el menú completo desde abajo. Módulos: Dashboard, Alumnos, Apoderados, Carnets QR, Auditoría. Implementado en `web/app/(admin)/`; cada página sigue llamando `requireAdmin()`.
- **Por qué:** un solo menú para todo el panel; el Release 2 (Buses, Tripulación, Consultas) entra como ítems nuevos del menú completo sin rediseñar. El menú de celular con solo un botón hamburguesa dejaba la navegación sin definir.
- **Descartado:** sidebar celeste con degradado (el cliente prefirió azul liso); solo botón hamburguesa en celular (poco descubrible).
- **Estado:** vigente. Pantallas de cada módulo todavía provisionales (`Pendiente`).

## 8/11/26 · Expiración de sesión y pantallas de error
- **Decisión:** la sesión del panel vence a los 20 minutos de inactividad o a las 8 horas del último ingreso, controlado en `proxy.ts`. Pantallas propias con el diseño del login: 404 (`app/not-found.tsx`) y errores (`app/error.tsx`, `app/global-error.tsx`); dentro del panel, el error (`app/(admin)/error.tsx`) mantiene el menú.
- **Por qué:** el token se renovaba solo y la sesión no terminaba nunca, en un panel con datos de menores. Las pantallas por defecto de Next salían sin el diseño del sistema.
- **Descartado:** `[auth.sessions]` de Supabase (en producción requiere plan pago).
- **Estado:** vigente. Los valores 20 min y 8 h se ajustan en `web/lib/session-limits.ts`.

## 9/11/26 · Cuentas de padres creadas por el administrador, sin correo
- **Decisión:** el administrador crea la cuenta de un apoderado desde la web con la Edge Function `guardian-account` (exige MFA completo e `is_web_admin()`). La contraseña temporal (16 caracteres) se muestra una sola vez y se entrega en persona. Reiniciar la contraseña es manual. Desactivar bloquea el inicio de sesión (`ban_duration`) y reactivar lo devuelve. No se obliga a cambiar la contraseña.
- **Por qué:** no hay SMTP y los padres no tienen cuenta si nadie la crea. Un solo administrador entrega las credenciales.
- **Descartado:** recuperación por correo (no hay SMTP); registro libre de padres (el registro está apagado).
- **Estado:** vigente

## 9/11/26 · La baja oculta al alumno en el móvil
- **Decisión:** desde la migración 033 la baja de un beneficiario oculta al alumno en la app móvil (requiere la carga inicial `033_backfill_beneficiaries.sql` antes de la 033, y aviso a TI SIGEM porque toca `public.social_bus_escolar`). Corrige la decisión del 7/11/26 de que la baja no cambiaba nada del móvil. La baja sigue sin cerrar el carnet.
- **Por qué:** un alumno de baja no debe aparecer en el móvil. El administrador ya lo confirmó.
- **Límite conocido:** la caché sin conexión del móvil conserva al alumno hasta que se actualice.
- **Estado:** vigente

## 9/11/26 · El carnet vence cada año y el perdido sigue funcionando
- **Decisión:** el carnet vence cada año (año evaluado en hora de Lima, sin cambiar la base de datos). Un carnet perdido sigue funcionando en el bus: es una limitación aceptada por el usuario. Reimprimir usa el mismo código; el anterior queda como reemplazado. Reportar perdido exige un motivo.
- **Por qué:** el código del padrón no cambia y el móvil no consulta `qr_codes`.
- **Descartado:** revocar de verdad (exige cambiar la app móvil).
- **Estado:** vigente

## 9/11/26 · Gráficos del Dashboard y CSP sin estilos en línea
- **Decisión:** el Dashboard dibuja sus gráficos como SVG en el servidor y no usa atributos `style`: la CSP de `proxy.ts` (`style-src` con nonce) los bloquea. Los valores dinámicos van en atributos SVG y los colores en clases.
- **Por qué:** los estilos en línea no se veían (barras y colores de leyenda en blanco).
- **Estado:** vigente

## 9/11/26 · Dos comprobaciones de administrador: páginas livianas, acciones estrictas
- **Decisión:** las páginas del panel comprueban la sesión con `getClaims()` (firma del token, sin llamada de red) más `is_web_admin` y MFA, una sola vez por petición (`React.cache`). Las Server Actions que escriben usan además `getUser()`, que pregunta a Auth si la sesión sigue viva. Las funciones `admin_*` de la base siempre verifican el rol.
- **Por qué:** cada página hacía 4 llamadas a Supabase en fila y el sistema se sentía lento. Un token vigente de alguien bloqueado puede leer hasta que vence (1 hora); con un solo administrador con MFA se acepta, y escribir sí exige sesión viva.
- **Descartado:** quitar `is_web_admin` de las páginas (un usuario que no es administrador vería el panel vacío en vez de ir al login).
- **Estado:** vigente

## 9/11/26 · Solo las funciones del panel escriben apoderados y vínculos
- **Decisión:** la migración 040 quita las políticas heredadas `coordinator_manage_bus_guardians` y `coordinator_manage_bus_student_guardians` y los permisos de escritura de `authenticated` sobre esas tablas. La app móvil solo las lee.
- **Por qué:** el coordinador podía escribir directo, sin auditoría ni pasar por las funciones.
- **Pendiente:** confirmar con quien opere la app móvil que ningún coordinador gestione apoderados desde ella, y aplicar en producción.
- **Estado:** vigente en local, sin aplicar en producción

