-- =============================================================================
-- Rollback de 026 y 027 (NO aplicado).
-- El valor 'administrador' de 025 no se puede quitar del enum; queda inerte si
-- ningun perfil lo usa. Antes de ejecutar: respaldar. Borrar qr_codes y
-- admin_audit_log elimina el historial de emisiones y la auditoria (irreversible).
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "admin_read_padron" ON public.social_bus_escolar;

DROP FUNCTION IF EXISTS buscontrol.report_qr_lost(uuid, text);
DROP FUNCTION IF EXISTS buscontrol.issue_qr_card(uuid, text);

DROP TABLE IF EXISTS buscontrol.admin_audit_log;
DROP TABLE IF EXISTS buscontrol.qr_codes;

DROP FUNCTION IF EXISTS buscontrol.is_web_admin();

COMMIT;
