-- =============================================================================
-- Fase C — Crew atado a bus + RLS padrón municipal
-- Pre-requisito: 012 y 013 aplicados.
-- Coordinar con TI SIGEM: políticas en public.social_bus_escolar (schema compartido).
-- Ejecutar COMPLETO en Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- C.1 — Helpers (idempotentes; 013 ya creó user_assigned_to_bus)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.user_assigned_to_bus(p_bus_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = auth.uid()
        AND bca.bus_id = p_bus_id
        AND bca.assignment_date = CURRENT_DATE
        AND bca.is_active = true
    )
    OR buscontrol.current_app_role() = 'coordinador'
$$;

CREATE OR REPLACE FUNCTION buscontrol.is_guardian_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM buscontrol.student_guardians sg
      WHERE sg.student_id = p_student_id
        AND sg.guardian_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM buscontrol.bus_guardians bg
      JOIN buscontrol.bus_student_guardians bsg ON bsg.guardian_id = bg.id
      WHERE bsg.student_id = p_student_id
        AND bg.auth_user_id = auth.uid()
        AND COALESCE(bg.is_active, true) = true
    )
$$;

GRANT EXECUTE ON FUNCTION buscontrol.user_assigned_to_bus(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.is_guardian_of_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION buscontrol.is_guardian_of_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM buscontrol.student_trip_status sts
    WHERE sts.trip_id = p_trip_id
      AND buscontrol.is_guardian_of_student(sts.student_id)
  )
  OR EXISTS (
    SELECT 1
    FROM buscontrol.bus_attendance_records ar
    WHERE ar.trip_id = p_trip_id
      AND ar.voided_at IS NULL
      AND buscontrol.is_guardian_of_student(ar.student_id)
  )
$$;

GRANT EXECUTE ON FUNCTION buscontrol.is_guardian_of_trip(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- C.2 — RLS bus_crew_assignments (operadores ven solo su asignación hoy)
-- -----------------------------------------------------------------------------

ALTER TABLE buscontrol.bus_crew_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all authenticated" ON buscontrol.bus_crew_assignments;
DROP POLICY IF EXISTS "read_crew" ON buscontrol.bus_crew_assignments;
DROP POLICY IF EXISTS "ops_read_own_crew" ON buscontrol.bus_crew_assignments;
DROP POLICY IF EXISTS "coordinador_read_crew" ON buscontrol.bus_crew_assignments;

CREATE POLICY "ops_read_own_crew" ON buscontrol.bus_crew_assignments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR buscontrol.current_app_role() = 'coordinador'
  );

-- INSERT/UPDATE/DELETE crew: solo service_role o coordinador vía SQL manual por ahora

-- -----------------------------------------------------------------------------
-- C.3 — RLS public.social_bus_escolar (padrón municipal)
-- Operadores: lectura completa. Padres: solo hijos vinculados. Resto: denegado.
-- -----------------------------------------------------------------------------

ALTER TABLE public.social_bus_escolar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all authenticated" ON public.social_bus_escolar;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.social_bus_escolar;
DROP POLICY IF EXISTS "Authenticated users can read" ON public.social_bus_escolar;
DROP POLICY IF EXISTS "ops_read_padron" ON public.social_bus_escolar;
DROP POLICY IF EXISTS "guardian_read_linked_padron" ON public.social_bus_escolar;

CREATE POLICY "ops_read_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
  );

CREATE POLICY "guardian_read_linked_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (
    buscontrol.is_guardian_of_student(id)
  );

-- Padres sin vínculo → 0 filas. SELECT masivo de padre → vacío (pentest Fase F #5).

-- -----------------------------------------------------------------------------
-- C.4 — Refuerzo GPS: ubicaciones solo si asignado al bus del viaje
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "ops_manage_trip_locations" ON buscontrol.bus_trip_locations;

CREATE POLICY "ops_read_trip_locations" ON buscontrol.bus_trip_locations
  FOR SELECT TO authenticated
  USING (
    buscontrol.is_active_operator()
    OR buscontrol.is_guardian_of_trip(trip_id)
  );

-- INSERT vía publish_driver_location RPC (SECURITY DEFINER); sin INSERT directo.
