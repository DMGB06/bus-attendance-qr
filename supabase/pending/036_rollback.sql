-- Rollback de 036: quita las tres funciones. No toca datos (las filas 'qr_print' de la auditoria se conservan).
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.admin_list_cards(text, text, integer, integer);
DROP FUNCTION IF EXISTS buscontrol.log_qr_print(uuid[], text);
DROP FUNCTION IF EXISTS buscontrol.issue_qr_cards(uuid[]);
COMMIT;
