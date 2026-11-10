# Riesgos y decisiones pendientes

## Riesgos identificados
1. Existe un solo usuario administrador. Si se olvida la contraseña o deja la municipalidad, no hay respaldo claro de recuperación o transferencia de rol. El rol solo se puede asignar manualmente con privilegios de servicio.
2. Un carnet reportado como perdido sigue validando en el móvil, porque el móvil solo consulta el padrón. La revocación real requiere cambiar la app móvil (opción 2 del documento 11). El usuario la aceptó el 9/11/26.
3. La política de lectura del padrón para el administrador requiere aviso previo a TI SIGEM (schema compartido).
4. El sistema usará el dominio por defecto de Vercel (`*.vercel.app`); un dominio municipal propio es mejora futura.
5. Las migraciones 025–029 no se han probado contra una base de datos real (solo en Docker local).
6. Solo los carnets QR tienen permisos de escritura para el administrador. Apoderados, vínculos, buses y tripulación hoy son de solo lectura para operadores y la tripulación se edita únicamente con service_role (migración 014). Cada módulo de escritura necesita su propia migración con funciones SECURITY DEFINER, o no funcionará.
7. El tipo `AppRole` de la app móvil no incluye `administrador`. No rompe en ejecución (rol desconocido = sin permisos), pero conviene añadirlo en algún momento.
8. El rol coordinador podía escribir directo en `bus_guardians` y `bus_student_guardians` por las políticas heredadas `coordinator_manage_*` (esquema base 0001, ya en producción). La migración 040 las quita; falta aplicarla en producción y confirmar que ningún coordinador gestione apoderados desde la app móvil.
9. `npm audit` en `web/` reporta 7 avisos moderados (minimatch, a través de typescript-eslint) y no tienen arreglo todavía. Solo afectan a las herramientas de desarrollo: `npm audit --omit=dev` da 0.
10. La IP del registro de sesión sale de `x-vercel-forwarded-for` o `x-real-ip` (y solo si es una IP válida). Es informativa.

## Decisiones pendientes
- Cantidad de carnets por hoja en el PDF de impresión
- Políticas de lectura del administrador sobre buses, viajes, asistencia, apoderados y tripulación (se definen con cada módulo)

## Decisiones ya resueltas
- Ubicación de la documentación: `docs/web/`
- El código del QR es el `codigo` del padrón; no se generan códigos nuevos; renovar = reimprimir (documento 11)
- Sin generación secuencial de códigos, por lo que no hay decisión pendiente sobre secuencias
- Estado activo/inactivo del alumno como beneficiario del servicio de transporte: se registra en una tabla propia de `buscontrol` (tabla `bus_beneficiaries`) que referencia al alumno del padrón por su `student_id` (id del padrón); el `codigo` solo se muestra. El padrón municipal `social_bus_escolar` permanece de solo lectura y no se modifica (ver 08-modelo-datos-alumnos-apoderados.md).
