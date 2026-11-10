-- =============================================================================
-- Rollback de 029 (NO aplicado).
-- Solo quita funciones y politicas del administrador. No toca datos de apoderados
-- ni vinculos. El historial queda en admin_audit_log.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS buscontrol.unlink_guardian(uuid, uuid);
DROP FUNCTION IF EXISTS buscontrol.set_primary_guardian(uuid, uuid);
DROP FUNCTION IF EXISTS buscontrol.link_guardian(uuid, uuid, text, boolean);
DROP FUNCTION IF EXISTS buscontrol.set_guardian_active(uuid, boolean);
DROP FUNCTION IF EXISTS buscontrol.update_guardian(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS buscontrol.create_guardian(text, text, text, text, text);
DROP FUNCTION IF EXISTS buscontrol._clean_guardian_fields(text, text, text, text, text);
DROP FUNCTION IF EXISTS buscontrol._require_web_admin();

DROP POLICY IF EXISTS "admin_read_bus_student_guardians" ON buscontrol.bus_student_guardians;
DROP POLICY IF EXISTS "admin_read_bus_guardians" ON buscontrol.bus_guardians;

COMMIT;
