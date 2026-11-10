-- Ejecutar SOLO después de que TI exponga buscontrol en Data API → Settings.

BEGIN;

ALTER TABLE public.bus_trips SET SCHEMA buscontrol;
ALTER TABLE public.bus_attendance_records SET SCHEMA buscontrol;

-- Descomentar si existe:
-- ALTER TABLE public.bus_student_guardians SET SCHEMA buscontrol;

COMMIT;
