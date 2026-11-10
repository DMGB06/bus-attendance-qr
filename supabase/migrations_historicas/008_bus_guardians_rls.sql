-- Fase 3 — Soporte catálogo municipal bus_guardians + bus_student_guardians
-- (datos reales de apoderados) además de student_guardians (auth directo).
-- Ejecutar tras 007 (o incluir is_guardian_of_student si 007 aún no corre).

CREATE OR REPLACE FUNCTION buscontrol.is_guardian_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
        AND bg.is_active = true
    );
$$;

GRANT EXECUTE ON FUNCTION buscontrol.is_guardian_of_student(uuid) TO authenticated;

-- =============================================================================
-- bus_guardians + bus_student_guardians (catálogo municipal)
-- =============================================================================
ALTER TABLE buscontrol.bus_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.bus_student_guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_read_own_bus_guardian" ON buscontrol.bus_guardians;
CREATE POLICY "guardian_read_own_bus_guardian" ON buscontrol.bus_guardians
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "ops_read_bus_guardians" ON buscontrol.bus_guardians;
CREATE POLICY "ops_read_bus_guardians" ON buscontrol.bus_guardians
  FOR SELECT TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

DROP POLICY IF EXISTS "coordinator_manage_bus_guardians" ON buscontrol.bus_guardians;
CREATE POLICY "coordinator_manage_bus_guardians" ON buscontrol.bus_guardians
  FOR ALL TO authenticated
  USING (buscontrol.current_app_role() = 'coordinador')
  WITH CHECK (buscontrol.current_app_role() = 'coordinador');

DROP POLICY IF EXISTS "guardian_read_own_student_links" ON buscontrol.bus_student_guardians;
CREATE POLICY "guardian_read_own_student_links" ON buscontrol.bus_student_guardians
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM buscontrol.bus_guardians bg
      WHERE bg.id = bus_student_guardians.guardian_id
        AND bg.auth_user_id = auth.uid()
        AND bg.is_active = true
    )
  );

DROP POLICY IF EXISTS "ops_read_bus_student_guardians" ON buscontrol.bus_student_guardians;
CREATE POLICY "ops_read_bus_student_guardians" ON buscontrol.bus_student_guardians
  FOR SELECT TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

DROP POLICY IF EXISTS "coordinator_manage_bus_student_guardians" ON buscontrol.bus_student_guardians;
CREATE POLICY "coordinator_manage_bus_student_guardians" ON buscontrol.bus_student_guardians
  FOR ALL TO authenticated
  USING (buscontrol.current_app_role() = 'coordinador')
  WITH CHECK (buscontrol.current_app_role() = 'coordinador');

-- =============================================================================
-- Reemplazar políticas padre con función unificada (ambos modelos)
-- =============================================================================
DROP POLICY IF EXISTS "guardian_read_linked_status" ON buscontrol.student_trip_status;
CREATE POLICY "guardian_read_linked_status" ON buscontrol.student_trip_status
  FOR SELECT TO authenticated
  USING (buscontrol.is_guardian_of_student(student_id));

DROP POLICY IF EXISTS "guardian_read_linked_trips" ON buscontrol.bus_trips;
CREATE POLICY "guardian_read_linked_trips" ON buscontrol.bus_trips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM buscontrol.student_trip_status sts
      WHERE sts.trip_id = bus_trips.id
        AND buscontrol.is_guardian_of_student(sts.student_id)
    )
    OR EXISTS (
      SELECT 1 FROM buscontrol.bus_attendance_records ar
      WHERE ar.trip_id = bus_trips.id
        AND buscontrol.is_guardian_of_student(ar.student_id)
    )
  );

DROP POLICY IF EXISTS "guardian_read_linked_attendance" ON buscontrol.bus_attendance_records;
CREATE POLICY "guardian_read_linked_attendance" ON buscontrol.bus_attendance_records
  FOR SELECT TO authenticated
  USING (buscontrol.is_guardian_of_student(student_id));
