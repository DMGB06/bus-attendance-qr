-- =============================================================================
-- Rollback de 030 (NO aplicado). Restaura los grants que tenian antes.
-- =============================================================================

BEGIN;

GRANT INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, MAINTAIN, UPDATE ON TABLE buscontrol.bus_guardians TO anon;
GRANT INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, MAINTAIN, UPDATE ON TABLE buscontrol.bus_student_guardians TO anon;

GRANT REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE buscontrol.bus_guardians TO authenticated;
GRANT REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE buscontrol.bus_student_guardians TO authenticated;

COMMIT;
