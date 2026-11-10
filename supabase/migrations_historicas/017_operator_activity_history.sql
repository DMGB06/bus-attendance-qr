-- =============================================================================
-- Historial operador — lectura de asistencia por rango de fechas (máx. 7 días)
-- Plan: docs/PLAN-HISTORIAL-OPERADOR.md (Fase H0)
--
-- ADDITIVO: solo crea/reemplaza una RPC de lectura.
-- No altera tablas, RLS, triggers ni RPCs existentes.
-- La app mobile no usa esta función hasta implementar Fase H1.
-- =============================================================================

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
  -- Validar fechas antes del rol: el límite de 7 días debe fallar siempre
  -- (también en SQL Editor, donde auth.uid() / current_app_role() suelen ser NULL).
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
  INNER JOIN buscontrol.bus_crew_assignments bca
    ON bca.bus_id = t.bus_id
   AND bca.assignment_date = t.trip_date
   AND bca.user_id = auth.uid()
   AND bca.is_active = true
  INNER JOIN public.social_bus_escolar s ON s.id = ar.student_id
  WHERE t.trip_date BETWEEN p_start_date AND p_end_date
  ORDER BY t.trip_date DESC, ar.scanned_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.get_operator_activity_range(date, date)
  TO authenticated;

COMMENT ON FUNCTION buscontrol.get_operator_activity_range(date, date) IS
  'Historial de asistencia para operadores: máx. 7 días, solo buses asignados por fecha (bus_crew_assignments).';
