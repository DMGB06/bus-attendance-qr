-- Rollback de 031 (NO aplicado). El historial queda en admin_audit_log.
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.log_admin_session(text, text, text);
COMMIT;
