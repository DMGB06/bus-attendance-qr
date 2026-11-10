# Modelo de datos — Registro de carnets QR

## Decisión clave
El valor que lleva el QR impreso es SIEMPRE el campo `codigo` del padrón municipal (`public.social_bus_escolar`), porque es lo que busca la app móvil al escanear. La web NO inventa códigos nuevos. La tabla `buscontrol.qr_codes` es un registro de emisiones (historial), no la fuente del valor escaneado. El móvil no consulta esta tabla.

## Tabla `buscontrol.qr_codes`
- `id`: identificador del registro
- `student_id`: alumno (referencia al padrón)
- `code`: copia del `codigo` del padrón en el momento de la emisión (no es único globalmente, porque un alumno puede tener varias emisiones con el mismo código)
- `status`: `vigente`, `reemplazado` o `reportado_perdido`
- `reason`: motivo opcional (máximo 200 caracteres)
- `issued_at`: fecha de emisión
- `issued_by`: administrador que emitió, derivado de la sesión en el servidor
- `closed_at`: fecha en que dejó de ser vigente

## Reglas
- Un alumno tiene como máximo un carnet `vigente` (índice único parcial).
- "Renovar" = reimprimir: cierra el vigente anterior como `reemplazado` y registra uno nuevo con el mismo código del padrón.
- "Reportar perdido" cierra el vigente como `reportado_perdido`; el alumno queda sin vigente hasta reemitir.
- Decisión aceptada (9/11/26, R-Q6): el carnet vence cada año. Un carnet `vigente` emitido en un año anterior (en hora de Lima) se muestra como vencido y se renueva con una emisión nueva; no cambia la base de datos.
- Decisión aceptada (9/11/26): un carnet perdido sigue funcionando en el bus hasta que se cambie la app móvil. Es una limitación conocida, no un defecto.
- Limitación conocida: como el móvil no consulta esta tabla, un carnet perdido sigue validando al escanearse. El estado es informativo. Revocación real requeriría la opción 2 del documento 11 (cambio en la app móvil).

## Tabla `buscontrol.admin_audit_log`
Auditoría propia del web: actor, acción, entidad, identificador de la entidad, detalles (JSON) y fecha. La escriben las funciones de base de datos, no el cliente. Solo el administrador puede leerla.

## Escritura y lectura
- Sin INSERT/UPDATE/DELETE directo desde el cliente. Solo funciones `issue_qr_card` y `report_qr_lost` (SECURITY DEFINER), que verifican rol administrador.
- Lectura de `qr_codes` y `admin_audit_log`: solo administrador. Operadores y apoderados no tienen acceso porque no lo necesitan.
- Acceso anónimo revocado explícitamente.

## Tablas reutilizadas sin modificar
- Padrón de alumnos de solo lectura (`social_bus_escolar`)
- Unidades de transporte (`bus_units`)
- Asignaciones de tripulación (`bus_crew_assignments`)
- Viajes (`bus_trips`)
- Registros de asistencia (`bus_attendance_records`)
- Perfiles de usuarios (`app_profiles`)

Pendiente para módulos posteriores: el administrador aún no tiene política de lectura sobre estas tablas (salvo el padrón en la migración 027). Se agregará en una migración propia cuando se construya cada módulo.
