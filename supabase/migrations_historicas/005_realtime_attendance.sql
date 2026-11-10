-- Fase 1 — Realtime en asistencia (roster compartido chofer + asistenta)
-- Ejecutar en SQL Editor tras 004.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE buscontrol.bus_attendance_records;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime no existe en este proyecto.';
END $$;
