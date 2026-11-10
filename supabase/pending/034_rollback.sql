-- Rollback de 034: quita la funcion de lista. No toca datos.
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.admin_list_students(text, text, integer, integer);
COMMIT;
