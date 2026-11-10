-- =============================================================================
-- Rollback de 028 (NO aplicado).
-- Borrar bus_beneficiaries elimina el estado de alta/baja de los alumnos
-- (irreversible). El historial de acciones queda en admin_audit_log.
-- Antes de ejecutar: respaldar.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS buscontrol.deactivate_beneficiary(uuid, text);
DROP FUNCTION IF EXISTS buscontrol.enroll_beneficiary(uuid);
DROP TABLE IF EXISTS buscontrol.bus_beneficiaries;

COMMIT;
