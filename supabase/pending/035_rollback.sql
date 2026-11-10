-- Rollback de 035: quita las dos funciones de lectura. No toca datos.
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.admin_list_guardians(text, text, integer, integer);
DROP FUNCTION IF EXISTS buscontrol.admin_guardian_detail(uuid);
COMMIT;
