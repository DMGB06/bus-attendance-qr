-- Rollback de 038: quita la funcion de la auditoria.
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.admin_list_audit(date, date, text, integer, integer);
COMMIT;
