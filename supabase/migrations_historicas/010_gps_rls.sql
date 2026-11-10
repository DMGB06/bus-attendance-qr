-- Fase 5 — GPS bus: RLS, Realtime bus_trips, retención puntos históricos.
-- Ejecutar en SQL Editor tras 009.

CREATE OR REPLACE FUNCTION buscontrol.is_guardian_of_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
      AND buscontrol.is_guardian_of_student(ar.student_id)
  );
$$;

GRANT EXECUTE ON FUNCTION buscontrol.is_guardian_of_trip(uuid) TO authenticated, service_role;

-- =============================================================================
-- bus_trip_locations
-- =============================================================================
ALTER TABLE buscontrol.bus_trip_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_manage_trip_locations" ON buscontrol.bus_trip_locations;
CREATE POLICY "ops_manage_trip_locations" ON buscontrol.bus_trip_locations
  FOR ALL TO authenticated
  USING (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  )
  WITH CHECK (
    buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
    OR buscontrol.current_app_role() IS NULL
  );

DROP POLICY IF EXISTS "guardian_read_linked_trip_locations" ON buscontrol.bus_trip_locations;
CREATE POLICY "guardian_read_linked_trip_locations" ON buscontrol.bus_trip_locations
  FOR SELECT TO authenticated
  USING (buscontrol.is_guardian_of_trip(trip_id));

DROP POLICY IF EXISTS "service_role_trip_locations" ON buscontrol.bus_trip_locations;
CREATE POLICY "service_role_trip_locations" ON buscontrol.bus_trip_locations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Padres: lectura de snapshot GPS en bus_trips (last_lat/lng/at)
DROP POLICY IF EXISTS "guardian_read_active_trip_gps" ON buscontrol.bus_trips;
CREATE POLICY "guardian_read_active_trip_gps" ON buscontrol.bus_trips
  FOR SELECT TO authenticated
  USING (
    buscontrol.is_guardian_of_trip(id)
    AND status = 'active'
  );

-- Realtime — actualización GPS en bus_trips para mapa padres
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE buscontrol.bus_trips;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime no existe en este proyecto.';
END $$;

-- =============================================================================
-- Retención — borrar puntos históricos > 30 días
-- =============================================================================
CREATE OR REPLACE FUNCTION buscontrol.purge_old_trip_locations(p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM buscontrol.bus_trip_locations
  WHERE recorded_at < now() - make_interval(days => p_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.purge_old_trip_locations(integer) TO service_role;

COMMENT ON FUNCTION buscontrol.purge_old_trip_locations(integer) IS
  'Retención GPS. Programar semanalmente (pg_cron o Edge Function scheduled).';
