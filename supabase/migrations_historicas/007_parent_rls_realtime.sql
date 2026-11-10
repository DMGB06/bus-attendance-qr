-- Fase 3 — RLS padres (student_guardians, student_trip_status, lectura acotada)
-- + Realtime en student_trip_status para UI apoderados.
-- Ejecutar en SQL Editor tras 004 (y 006 si aplica).

-- =============================================================================
-- student_guardians
-- =============================================================================
DROP POLICY IF EXISTS "guardian_read_own_links" ON buscontrol.student_guardians;
CREATE POLICY "guardian_read_own_links" ON buscontrol.student_guardians
  FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid());

DROP POLICY IF EXISTS "ops_read_student_guardians" ON buscontrol.student_guardians;
CREATE POLICY "ops_read_student_guardians" ON buscontrol.student_guardians
  FOR SELECT TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

DROP POLICY IF EXISTS "coordinator_manage_guardians" ON buscontrol.student_guardians;
CREATE POLICY "coordinator_manage_guardians" ON buscontrol.student_guardians
  FOR ALL TO authenticated
  USING (buscontrol.current_app_role() = 'coordinador')
  WITH CHECK (buscontrol.current_app_role() = 'coordinador');

-- =============================================================================
-- student_trip_status
-- =============================================================================
DROP POLICY IF EXISTS "guardian_read_linked_status" ON buscontrol.student_trip_status;
CREATE POLICY "guardian_read_linked_status" ON buscontrol.student_trip_status
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM buscontrol.student_guardians sg
      WHERE sg.student_id = student_trip_status.student_id
        AND sg.guardian_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ops_read_student_trip_status" ON buscontrol.student_trip_status;
CREATE POLICY "ops_read_student_trip_status" ON buscontrol.student_trip_status
  FOR SELECT TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

-- =============================================================================
-- Lectura acotada para padres (viajes + asistencia de sus hijos)
-- =============================================================================
-- Helper: operadores de campo (incluye V1 sin app_role asignado aún)
-- current_app_role() IS NULL → mismo acceso que chofer en MVP.

DROP POLICY IF EXISTS "ops_manage_bus_trips" ON buscontrol.bus_trips;
CREATE POLICY "ops_manage_bus_trips" ON buscontrol.bus_trips
  FOR ALL TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  )
  WITH CHECK (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

DROP POLICY IF EXISTS "guardian_read_linked_trips" ON buscontrol.bus_trips;
CREATE POLICY "guardian_read_linked_trips" ON buscontrol.bus_trips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM buscontrol.student_guardians sg
      WHERE sg.guardian_user_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM buscontrol.student_trip_status sts
            WHERE sts.trip_id = bus_trips.id AND sts.student_id = sg.student_id
          )
          OR EXISTS (
            SELECT 1 FROM buscontrol.bus_attendance_records ar
            WHERE ar.trip_id = bus_trips.id AND ar.student_id = sg.student_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "ops_manage_attendance" ON buscontrol.bus_attendance_records;
CREATE POLICY "ops_manage_attendance" ON buscontrol.bus_attendance_records
  FOR ALL TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  )
  WITH CHECK (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

DROP POLICY IF EXISTS "guardian_read_linked_attendance" ON buscontrol.bus_attendance_records;
CREATE POLICY "guardian_read_linked_attendance" ON buscontrol.bus_attendance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM buscontrol.student_guardians sg
      WHERE sg.student_id = bus_attendance_records.student_id
        AND sg.guardian_user_id = auth.uid()
    )
  );

-- =============================================================================
-- Realtime — estado del niño para apoderados
-- =============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE buscontrol.student_trip_status;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime no existe en este proyecto.';
END $$;
