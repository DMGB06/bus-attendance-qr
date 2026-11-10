# Glosario y entidades — Sistema web BusControl

## Términos del dominio
- **Administrador web**: único rol de acceso al sistema web. Distinto de los roles del móvil (chofer, asistenta, padre, coordinador).
- **Padrón municipal** (`social_bus_escolar`): fuente oficial de alumnos, solo lectura desde la web.
- **Beneficiario**: alumno registrado en el servicio de transporte escolar, gestionado en `bus_beneficiaries` (tabla propia de `buscontrol`). Referencia al padrón por `student_id` (id del `social_bus_escolar`), no por `codigo`; el `codigo` solo se muestra en el carnet. Estado activo o inactivo con `is_active`.
- **Baja lógica** (*soft delete*): desactivar un beneficiario con `is_active = false` sin borrar sus datos.
- **Carnets QR**: tarjetas impresas con el código del padrón (ej. BU0098) que escanea el móvil al subir/bajar del bus.
- **Renovación**: reimprimir carnet; cierra el vigente anterior como `reemplazado` y registra uno nuevo con el mismo código.

## Entidades principales
- **qr_codes** (`buscontrol`): registro de emisiones de carnet. Campos: `id`, `student_id`, `code`, `status` (`vigente`/`reemplazado`/`reportado_perdido`), `reason`, `issued_at`, `issued_by`, `closed_at`.
- **admin_audit_log** (`buscontrol`): auditoría de acciones del administrador. Campos: actor, acción, entidad, identificador, detalles (JSON), fecha.
- **bus_beneficiaries** (`buscontrol`, migración 028): tabla de beneficiarios de transporte escolar. Campos: `student_id` (llave primaria, referencia al `id` de `social_bus_escolar`), `is_active`, `enrolled_at`, `enrolled_by`, `deactivated_at`, `deactivated_by`, `deactivated_reason`. Funciones: `enroll_beneficiary(student_id)` y `deactivate_beneficiary(student_id, reason)`. El `codigo` solo se imprime en el carnet.
- **bus_guardians** (`buscontrol`): catálogo de apoderados. Campos: `full_name`, `phone`, `phone_normalized`, `dni`, `email`, `auth_user_id`, `is_active`, `notes`, fechas. Administrado desde la web con la migración 029. Su `CREATE TABLE` no está en `supabase/migrations/`; confirmar el esquema real en Supabase.
- **bus_student_guardians** (`buscontrol`): vínculo alumno-apoderado. Campos: `student_id`, `guardian_id`, `relationship`, `is_primary`, `created_at`. Sin columna de estado: desvincular borra la fila. Mismo caso: sin `CREATE TABLE` en el repo.
- **student_guardians** (`buscontrol`, migración 004): tabla distinta, usada por el móvil para el rol padre; no confundir con `bus_student_guardians`.
- **social_bus_escolar** (schema compartido): padrón municipal de alumnos, solo lectura.
- **bus_units** (`buscontrol`): unidades de transporte (Release 2).
- **bus_crew_assignments** (`buscontrol`): asignación de chofer/asistenta por fecha (Release 2).
- **bus_trips** (`buscontrol`): viajes (consulta solo lectura, Release 2).
- **bus_attendance_records** (`buscontrol`): registros de asistencia (consulta solo lectura, Release 2).

## Siglas y nombres internos
- **R1 / R2**: Release 1 y Release 2 del plan de entregas.
- **TI SIGEM**: área de TI del municipio con la que se coordina cambios en schema compartido.
- **SECURITY DEFINER**: tipo de función de Postgres que se ejecuta con los privilegios de su creador, usada para escrituras sensibles.
