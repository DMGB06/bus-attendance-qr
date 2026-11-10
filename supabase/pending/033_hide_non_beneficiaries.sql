-- =============================================================================
-- 033 - Ocultar en el movil a los alumnos que no son beneficiarios activos (R-A7)
-- NO aplicada en produccion. Requiere 025 a 029. TOCA public.social_bus_escolar (tabla compartida
-- con SIGEM): avisar a TI SIGEM antes de produccion, igual que con la 027.
-- NO APLICAR sin antes correr 033_backfill_beneficiaries.sql: con bus_beneficiaries vacia el
-- movil dejaria de mostrar a TODOS los alumnos.
--
-- El movil llega a los alumnos por tres rutas, las tres cubiertas aqui sin tocar su codigo:
--   1. Lectura directa de social_bus_escolar (politicas ops_read_padron y guardian_read_linked_padron).
--   2. buscontrol.get_my_guardian_students() (SECURITY DEFINER, se salta las politicas).
--   3. register_attendance -> student_exists_active().
-- La politica no consulta bus_beneficiaries directamente: el chofer no tiene SELECT ahi y veria
-- la tabla vacia. Usa is_active_beneficiary(), SECURITY DEFINER.
-- No se cambia: admin_read_padron (el administrador sigue viendo todo), get_operator_activity_range
-- (historial de asistencia) ni nada del padron en si.
-- Limite conocido: el cache sin conexion del movil conserva al alumno hasta refrescarse, y un
-- escaneo hecho sin conexion antes de la baja se rechaza al sincronizar.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.is_active_beneficiary(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM buscontrol.bus_beneficiaries b
    WHERE b.student_id = p_student_id AND b.is_active
  )
$$;

REVOKE ALL ON FUNCTION buscontrol.is_active_beneficiary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.is_active_beneficiary(uuid) TO authenticated;

DROP POLICY IF EXISTS "ops_read_padron" ON public.social_bus_escolar;
CREATE POLICY "ops_read_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (
    buscontrol.current_app_role() = ANY (ARRAY['chofer'::buscontrol.app_role, 'asistenta'::buscontrol.app_role, 'coordinador'::buscontrol.app_role])
    AND buscontrol.is_active_beneficiary(id)
  );

DROP POLICY IF EXISTS "guardian_read_linked_padron" ON public.social_bus_escolar;
CREATE POLICY "guardian_read_linked_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (buscontrol.is_guardian_of_student(id) AND buscontrol.is_active_beneficiary(id));

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
    AND buscontrol.is_active_beneficiary(s.id)
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
      AND buscontrol.is_active_beneficiary(s.id)
  )
$$;

COMMIT;
