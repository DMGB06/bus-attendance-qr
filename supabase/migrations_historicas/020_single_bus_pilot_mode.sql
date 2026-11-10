-- =============================================================================
-- Piloto un solo bus — auto BUS-01 sin fila manual en bus_crew_assignments
-- Plan: simplificación campo Cerro Azul (1 unidad activa).
--
-- Cuando solo hay 1 bus_units activo, chofer/asistenta/coordinador operan
-- sobre ese bus sin INSERT diario en bus_crew_assignments.
-- Con 2+ buses activos, sigue siendo obligatoria la asignación manual.
--
-- ADDITIVO: helpers + reemplaza get_user_bus_id_today, user_assigned_to_bus,
-- get_operator_activity_range (historial operador).
-- =============================================================================

CREATE OR REPLACE FUNCTION buscontrol.count_active_bus_units()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT count(*)::integer
  FROM buscontrol.bus_units
  WHERE is_active = true;
$$;

CREATE OR REPLACE FUNCTION buscontrol.is_single_bus_pilot_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT buscontrol.count_active_bus_units() = 1;
$$;

CREATE OR REPLACE FUNCTION buscontrol.get_default_pilot_bus_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT bu.id
  FROM buscontrol.bus_units bu
  WHERE bu.is_active = true
  ORDER BY bu.code
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION buscontrol.user_has_pilot_bus_access(p_bus_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT
    buscontrol.is_single_bus_pilot_mode()
    AND p_bus_id = buscontrol.get_default_pilot_bus_id()
    AND buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador');
$$;

CREATE OR REPLACE FUNCTION buscontrol.get_user_bus_id_today()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT COALESCE(
    (
      SELECT bca.bus_id
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = auth.uid()
        AND bca.assignment_date = CURRENT_DATE
        AND bca.is_active = true
      ORDER BY CASE bca.crew_role WHEN 'chofer' THEN 0 ELSE 1 END
      LIMIT 1
    ),
    CASE
      WHEN buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
       AND buscontrol.is_single_bus_pilot_mode()
      THEN buscontrol.get_default_pilot_bus_id()
      ELSE NULL
    END
  );
$$;

CREATE OR REPLACE FUNCTION buscontrol.user_assigned_to_bus(p_bus_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    OR buscontrol.user_has_pilot_bus_access(p_bus_id);
$$;

CREATE OR REPLACE FUNCTION buscontrol.get_operator_activity_range(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  record_id uuid,
  trip_id uuid,
  trip_date date,
  trip_direction text,
  turn_type text,
  trip_status text,
  student_id uuid,
  student_name text,
  event_type text,
  scanned_at timestamptz,
  scanned_by uuid,
  voided_at timestamptz,
  is_offline_sync boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_role buscontrol.app_role;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RETURN;
  END IF;

  IF (p_end_date - p_start_date) > 6 THEN
    RAISE EXCEPTION 'date_range_exceeds_7_days'
      USING HINT = 'El rango máximo permitido es de 7 días (inclusive).';
  END IF;

  v_role := buscontrol.current_app_role();

  IF v_role IS NULL OR v_role NOT IN ('chofer', 'asistenta', 'coordinador') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ar.id AS record_id,
    t.id AS trip_id,
    t.trip_date,
    t.direction::text AS trip_direction,
    t.turn_type::text AS turn_type,
    t.status::text AS trip_status,
    ar.student_id,
    s.nombre_alumno AS student_name,
    ar.event_type,
    ar.scanned_at,
    ar.scanned_by,
    ar.voided_at,
    COALESCE(ar.is_offline_sync, false) AS is_offline_sync
  FROM buscontrol.bus_attendance_records ar
  INNER JOIN buscontrol.bus_trips t ON t.id = ar.trip_id
  INNER JOIN public.social_bus_escolar s ON s.id = ar.student_id
  WHERE t.trip_date BETWEEN p_start_date AND p_end_date
    AND (
      EXISTS (
        SELECT 1
        FROM buscontrol.bus_crew_assignments bca
        WHERE bca.bus_id = t.bus_id
          AND bca.assignment_date = t.trip_date
          AND bca.user_id = auth.uid()
          AND bca.is_active = true
      )
      OR buscontrol.user_has_pilot_bus_access(t.bus_id)
    )
  ORDER BY t.trip_date DESC, ar.scanned_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.count_active_bus_units() TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.is_single_bus_pilot_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.get_default_pilot_bus_id() TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.user_has_pilot_bus_access(uuid) TO authenticated;

COMMENT ON FUNCTION buscontrol.is_single_bus_pilot_mode() IS
  'True cuando hay exactamente 1 bus_units activo (piloto Cerro Azul).';
COMMENT ON FUNCTION buscontrol.get_user_bus_id_today() IS
  'Bus del operador hoy: asignación crew o auto BUS único en piloto.';
COMMENT ON FUNCTION buscontrol.user_assigned_to_bus(uuid) IS
  'Permiso operar bus: crew hoy, coordinador, o piloto un solo bus.';
