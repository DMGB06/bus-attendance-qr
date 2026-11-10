-- Rollback de 033: restaura las politicas y funciones originales (0001/0002). No toca
-- bus_beneficiaries ni el padron: el movil vuelve a ver a todos los alumnos activos del padron.
BEGIN;

DROP POLICY IF EXISTS "ops_read_padron" ON public.social_bus_escolar;
CREATE POLICY "ops_read_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (buscontrol.current_app_role() = ANY (ARRAY['chofer'::buscontrol.app_role, 'asistenta'::buscontrol.app_role, 'coordinador'::buscontrol.app_role]));

DROP POLICY IF EXISTS "guardian_read_linked_padron" ON public.social_bus_escolar;
CREATE POLICY "guardian_read_linked_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (buscontrol.is_guardian_of_student(id));

CREATE OR REPLACE FUNCTION buscontrol.get_my_guardian_students()
RETURNS SETOF public.social_bus_escolar
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $$
  SELECT s.*
  FROM public.social_bus_escolar s
  WHERE buscontrol.is_guardian_of_student(s.id)
  ORDER BY s.nombre_alumno;
$$;

CREATE OR REPLACE FUNCTION buscontrol.student_exists_active(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.social_bus_escolar s
    WHERE s.id = p_student_id
      AND COALESCE(s.activo, true) = true
  )
$$;

DROP FUNCTION IF EXISTS buscontrol.is_active_beneficiary(uuid);

COMMIT;
