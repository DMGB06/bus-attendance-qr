-- =============================================================================
-- 022 — Permitir volver a registrar bajada tras anular (void)
-- Ejecutar en Supabase SQL Editor.
-- =============================================================================

-- Índice único solo entre registros activos (no anulados)
DROP INDEX IF EXISTS buscontrol.bus_attendance_unique_active_event;
DROP INDEX IF EXISTS buscontrol.bus_attendance_records_trip_student_event_unique;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'buscontrol'
      AND t.relname = 'bus_attendance_records'
      AND c.contype = 'u'
  LOOP
    EXECUTE format(
      'ALTER TABLE buscontrol.bus_attendance_records DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS bus_attendance_unique_active_event
  ON buscontrol.bus_attendance_records (trip_id, student_id, event_type)
  WHERE voided_at IS NULL;

-- IMPORTANTE: en register_attendance, la validación de duplicados debe usar:
--   AND voided_at IS NULL
-- Si tras esta migración sigue fallando al re-escanear, revisa esa función en SQL Editor.
