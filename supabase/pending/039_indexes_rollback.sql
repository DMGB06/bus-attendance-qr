-- Rollback de 039_indexes: quita los indices. No quita pg_trgm (otras cosas pueden usarla).
BEGIN;
DROP INDEX IF EXISTS buscontrol.idx_bus_guardians_full_name_trgm;
DROP INDEX IF EXISTS buscontrol.idx_bus_guardians_dni_prefix;
DROP INDEX IF EXISTS buscontrol.idx_bus_guardians_phone_prefix;
DROP INDEX IF EXISTS buscontrol.idx_bus_student_guardians_guardian;
DROP INDEX IF EXISTS buscontrol.idx_bus_student_guardians_primary;
DROP INDEX IF EXISTS buscontrol.idx_qr_codes_student_issued;
DROP INDEX IF EXISTS buscontrol.idx_qr_codes_issued_at;
DROP INDEX IF EXISTS buscontrol.idx_admin_audit_log_created_id;
COMMIT;
