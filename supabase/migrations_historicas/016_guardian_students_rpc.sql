-- =============================================================================
-- Padres: leer padrón de hijos vinculados (bypass RLS public con filtro seguro)
-- Ejecutar en Supabase SQL Editor si el padre ve vínculos pero no datos del alumno.
-- Pre-requisito: is_guardian_of_student (007/008/014).
-- =============================================================================

CREATE OR REPLACE FUNCTION buscontrol.get_my_guardian_students()
RETURNS SETOF public.social_bus_escolar
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT s.*
  FROM public.social_bus_escolar s
  WHERE buscontrol.is_guardian_of_student(s.id)
  ORDER BY s.nombre_alumno;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.get_my_guardian_students() TO authenticated;
