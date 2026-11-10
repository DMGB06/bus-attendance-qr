-- Rollback de 037: quita la funcion del Dashboard.
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.admin_dashboard();
COMMIT;
