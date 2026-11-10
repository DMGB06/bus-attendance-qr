-- =============================================================================
-- 039 - Indices de rendimiento de las tablas del panel (schema buscontrol)
-- NO aplicada en produccion. Requiere 026 (qr_codes, admin_audit_log), 028 y 029 (apoderados). Solo AGREGA indices
-- y la extension pg_trgm (en el schema extensions, como en Supabase). No cambia datos, tablas ni politicas.
-- Los indices del padron (public.social_bus_escolar, compartido con SIGEM) van aparte: 039_indexes_padron.sql.
--
-- Para que sirven (funciones 034 a 038):
--   bus_guardians: busqueda por nombre (trigram, tambien para %texto%), por DNI y por telefono (prefijo).
--   bus_student_guardians (guardian_id): apoderados con cuantos alumnos tienen; (student_id) del principal.
--   qr_codes (student_id, issued_at DESC): carnet mas reciente de cada alumno; (issued_at): carnets emitidos por mes.
--   admin_audit_log (created_at DESC, id): lista de auditoria ordenada y paginada sin ordenar toda la tabla.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_bus_guardians_full_name_trgm ON buscontrol.bus_guardians USING gin (full_name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bus_guardians_dni_prefix ON buscontrol.bus_guardians (dni text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_bus_guardians_phone_prefix ON buscontrol.bus_guardians (phone_normalized text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_bus_student_guardians_guardian ON buscontrol.bus_student_guardians (guardian_id);
CREATE INDEX IF NOT EXISTS idx_bus_student_guardians_primary ON buscontrol.bus_student_guardians (student_id, created_at) WHERE is_primary;
CREATE INDEX IF NOT EXISTS idx_qr_codes_student_issued ON buscontrol.qr_codes (student_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_issued_at ON buscontrol.qr_codes (issued_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_id ON buscontrol.admin_audit_log (created_at DESC, id);

COMMIT;
