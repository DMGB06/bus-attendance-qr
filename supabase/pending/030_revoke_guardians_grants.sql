-- =============================================================================
-- 030 - Quitar grants sobrantes en apoderados (NO aplicada en produccion)
-- Requiere 029 (o el esquema base: solo toca grants, no datos ni politicas).
--   * anon: se revoca todo. Ninguna politica RLS de estas tablas es TO anon,
--     asi que anon no tenia acceso efectivo.
--   * authenticated: se quitan TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, que
--     RLS no controla y la app nunca usa. Se mantienen SELECT, INSERT, UPDATE,
--     DELETE (los usa el coordinador del movil, controlado por RLS).
--   * service_role no cambia.
-- =============================================================================

BEGIN;

REVOKE ALL ON TABLE buscontrol.bus_guardians FROM anon;
REVOKE ALL ON TABLE buscontrol.bus_student_guardians FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE buscontrol.bus_guardians FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE buscontrol.bus_student_guardians FROM authenticated;

COMMIT;
