# Migraciones SQL — Rol administrador, registro de QR, padrón, beneficiarios y apoderados

Archivos en `supabase/migrations/` (025) y `supabase/pending/` (026, 027, 028, 029 y sus rollbacks; se aplican a mano, no con `db reset`). Ensayados en Docker local con el esquema real de producción sin datos (`supabase/tests/`). APLICADOS EN PRODUCCIÓN el 2026-11-07 (025 a 030, en orden, cada una por separado, con respaldo previo y verificación después de cada paso). Falta crear el usuario administrador (paso manual) y la web.

## 025_add_administrador_role.sql
Agrega el valor `administrador` al enum `buscontrol.app_role`. Se ejecuta SOLA y sin transacción, porque PostgreSQL no permite usar un valor de enum recién agregado dentro de la misma transacción.

## 026_create_qr_codes_and_admin_audit.sql
- Función `is_web_admin()`
- Tablas `qr_codes` y `admin_audit_log` con RLS (lectura solo administrador) y privilegios de escritura revocados
- Funciones `issue_qr_card` y `report_qr_lost` (SECURITY DEFINER, verifican rol, derivan el usuario de la sesión, escriben auditoría)
- Requiere 025 ya ejecutada y confirmada

## 027_admin_read_padron.sql
Política de lectura del padrón para el administrador. Es la ÚNICA migración que toca el schema compartido `public`. NO ejecutar en producción sin avisar antes a TI SIGEM. Sin ella el administrador lee cero filas.

## 028_create_bus_beneficiaries.sql
- Tabla `buscontrol.bus_beneficiaries`: `student_id` (llave primaria y referencia a `social_bus_escolar.id`), `is_active`, `enrolled_at`, `enrolled_by`, `deactivated_at`, `deactivated_by`, `deactivated_reason`
- Constraint de estado: activo sin datos de baja, o inactivo con `deactivated_at`, `deactivated_by` y motivo no vacío (máximo 200 caracteres)
- Funciones `enroll_beneficiary(student_id)` (alta o reactivación) y `deactivate_beneficiary(student_id, reason)` (baja lógica, motivo obligatorio). SECURITY DEFINER, verifican rol administrador, derivan el usuario de `auth.uid()`
- Auditoría en `admin_audit_log`: `beneficiary_enroll`, `beneficiary_reactivate`, `beneficiary_deactivate`
- `student_id` es la llave al padrón; el `codigo` (ej. BU0098) solo se muestra, nunca es clave
- Baja lógica sin cerrar el carnet vigente (`qr_codes` no se toca). La 028 sola no cambia nada del móvil, pero desde la migración 033 la baja oculta al alumno en el móvil (R-A7); la 033 requiere antes la carga inicial `033_backfill_beneficiaries.sql`
- Requiere 025 y 026 ya ejecutadas y confirmadas

## 029_guardians_admin_rpc.sql
- Políticas SELECT para el administrador en `buscontrol.bus_guardians` y `buscontrol.bus_student_guardians`. No cambia políticas ni columnas existentes
- Funciones de escritura (SECURITY DEFINER, solo administrador, auditadas): `create_guardian`, `update_guardian`, `set_guardian_active`, `link_guardian`, `set_primary_guardian`, `unlink_guardian`
- Helpers internos `_require_web_admin()` y `_clean_guardian_fields()`, sin permiso para `anon` ni `authenticated`
- Validación: teléfono de 9 dígitos (se quita el prefijo 51), DNI de 8 dígitos, correo con formato válido
- Desactivar apoderado = `is_active = false`. Corta su acceso en el móvil, porque `is_guardian_of_student` exige `is_active`
- Desvincular = borrar la fila de `bus_student_guardians`; el historial queda en `admin_audit_log`
- Un solo apoderado principal por alumno, impuesto por `link_guardian` y `set_primary_guardian` (sin índice único hasta revisar datos reales)
- La web NO crea usuarios de login: `auth_user_id` queda NULL
- Solo toca `buscontrol`
- Requiere 025 y 026 ya ejecutadas y confirmadas

## 030_revoke_guardians_grants.sql
- Revoca todo a `anon` sobre `bus_guardians` y `bus_student_guardians`. Ninguna política RLS es `TO anon`, así que no había acceso efectivo.
- Quita a `authenticated` TRUNCATE, REFERENCES, TRIGGER y MAINTAIN, que RLS no controla y la app no usa. Mantiene SELECT, INSERT, UPDATE y DELETE (el coordinador del móvil).
- Solo toca grants. Probada en Docker: `anon` sin privilegios, admin sigue leyendo y el resto de pruebas de 029 no cambian.

## Rollbacks
- `027_rollback.sql`: revierte 026 y 027; borra historial de carnets y auditoría
- `028_rollback.sql`: borra la tabla `bus_beneficiaries` y sus funciones; elimina el estado de alta y baja (irreversible)
- `029_rollback.sql`: quita funciones y políticas de apoderados; no borra apoderados ni vínculos
- `030_rollback.sql`: restaura los grants que quitó 030

## Orden de ejecución
1. 025, sola, y confirmar que el enum tiene 5 valores
2. 026
3. 027 (tras aviso a TI SIGEM)
4. 028
5. 029
6. 030
7. Crear manualmente el usuario administrador: el trigger de protección impide autoasignarse rol, por lo que se hace desde el panel de Supabase con privilegios de servicio (asignar `app_role = 'administrador'` en `app_profiles`)

## Verificación posterior
- Enum con `administrador`
- Como administrador: `SELECT` en `qr_codes` funciona; `INSERT` directo falla; `issue_qr_card` funciona
- Como chofer o padre: `issue_qr_card` falla con "Solo el administrador..."; `SELECT` en `qr_codes` devuelve cero filas
- Como anónimo: sin acceso
- Emitir dos veces al mismo alumno: el primero queda `reemplazado`, solo uno `vigente`
- Alumno sin código en el padrón: error claro
- Como administrador, `SELECT` en el padrón devuelve filas (tras 027)
- Como administrador, `SELECT` en `bus_beneficiaries` funciona; `enroll_beneficiary` y `deactivate_beneficiary` funcionan; `INSERT` directo falla
- Como chofer o padre: `enroll_beneficiary` y `deactivate_beneficiary` fallan con "Solo el administrador..."; `SELECT` en `bus_beneficiaries` devuelve cero filas
- Como administrador: alta de apoderado con datos inválidos da error claro; vincular, marcar principal y desvincular funcionan; `INSERT` directo en `bus_guardians` falla
- Como anónimo: sin acceso

## Ensayo recomendado antes de producción
Ejecutar 025 a 029 primero en un proyecto Supabase de pruebas o en una copia de la base, con usuarios de cada rol, usando `supabase/tests/etapa1_roles.sql`, `etapa1_extra.sql`, `etapa2_beneficiarios.sql` y `etapa2_apoderados.sql`.
