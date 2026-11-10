-- Fase 2 — Anular asistencia (solo chofer, viaje activo del día) + recalcular status

CREATE OR REPLACE FUNCTION buscontrol.recalc_student_trip_status(
  p_trip_id uuid,
  p_student_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_rec buscontrol.bus_attendance_records;
  v_direction text;
  v_trip_date date;
  v_status text;
BEGIN
  SELECT *
  INTO v_rec
  FROM buscontrol.bus_attendance_records
  WHERE trip_id = p_trip_id
    AND student_id = p_student_id
    AND voided_at IS NULL
  ORDER BY scanned_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    DELETE FROM buscontrol.student_trip_status
    WHERE trip_id = p_trip_id AND student_id = p_student_id;
    RETURN;
  END IF;

  SELECT direction, trip_date
  INTO v_direction, v_trip_date
  FROM buscontrol.bus_trips
  WHERE id = p_trip_id;

  v_status := CASE
    WHEN v_rec.event_type = 'ausente' THEN 'absent'
    WHEN v_rec.event_type IN ('subio', 'manual') AND v_direction = 'recojo' THEN 'onboard'
    WHEN v_rec.event_type = 'bajo' AND v_direction = 'recojo' THEN 'at_school'
    WHEN v_rec.event_type IN ('subio', 'manual') AND v_direction = 'retorno' THEN 'returning'
    WHEN v_rec.event_type = 'bajo' AND v_direction = 'retorno' THEN 'dropped_off'
    ELSE 'pending'
  END;

  INSERT INTO buscontrol.student_trip_status (
    student_id, trip_id, trip_date, direction, status,
    last_event_type, last_event_at, updated_at
  ) VALUES (
    p_student_id, p_trip_id, v_trip_date, v_direction, v_status,
    v_rec.event_type, COALESCE(v_rec.scanned_at, now()), now()
  )
  ON CONFLICT (student_id, trip_id) DO UPDATE SET
    status = EXCLUDED.status,
    last_event_type = EXCLUDED.last_event_type,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.void_attendance_record(
  p_record_id uuid,
  p_reason text
)
RETURNS buscontrol.bus_attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_record buscontrol.bus_attendance_records;
  v_user uuid := auth.uid();
  v_role buscontrol.app_role;
  v_reason text := left(trim(coalesce(p_reason, '')), 200);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para anular registros.';
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Debes indicar un motivo de anulación.';
  END IF;

  SELECT app_role INTO v_role
  FROM buscontrol.app_profiles
  WHERE id = v_user;

  IF v_role IS NOT NULL AND v_role NOT IN ('chofer', 'coordinador') THEN
    RAISE EXCEPTION 'Solo el chofer puede anular registros.';
  END IF;

  SELECT * INTO v_record
  FROM buscontrol.bus_attendance_records
  WHERE id = p_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado.';
  END IF;

  IF v_record.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'El registro ya fue anulado.';
  END IF;

  PERFORM 1
  FROM buscontrol.bus_trips t
  WHERE t.id = v_record.trip_id
    AND t.status = 'active'
    AND t.trip_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo se puede anular en un viaje activo del día.';
  END IF;

  UPDATE buscontrol.bus_attendance_records
  SET
    voided_at = now(),
    voided_by = v_user,
    void_reason = v_reason
  WHERE id = p_record_id
  RETURNING * INTO v_record;

  PERFORM buscontrol.recalc_student_trip_status(v_record.trip_id, v_record.student_id);

  RETURN v_record;
END;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.void_attendance_record(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.recalc_student_trip_status(uuid, uuid) TO authenticated;
