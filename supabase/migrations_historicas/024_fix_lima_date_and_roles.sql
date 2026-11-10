-- =============================================================================
-- 024 - Fecha de Lima y validacion de roles en BusControl
-- NO aplicada. Revisar, respaldar la BD y ejecutar fuera de horario de ruta.
-- Rollback: 024_rollback.sql
-- Solo toca el schema buscontrol.
--
-- Antes de aplicar, comprobar:
--   show timezone;
--   select id, email from buscontrol.app_profiles where app_role is null;
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.lima_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'America/Lima')::date;
$$;

CREATE OR REPLACE FUNCTION buscontrol.user_assigned_to_bus(p_bus_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = auth.uid()
        AND bca.bus_id = p_bus_id
        AND bca.assignment_date = buscontrol.lima_today()
        AND bca.is_active = true
    )
    OR buscontrol.current_app_role() = 'coordinador'
    OR buscontrol.user_has_pilot_bus_access(p_bus_id);
$function$;

CREATE OR REPLACE FUNCTION buscontrol.get_user_bus_id_today()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT bca.bus_id
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = auth.uid()
        AND bca.assignment_date = buscontrol.lima_today()
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
$function$;

CREATE OR REPLACE FUNCTION buscontrol.void_attendance_record(p_record_id uuid, p_reason text)
RETURNS buscontrol.bus_attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $function$
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

  -- current_app_role exige cuenta activa; sin rol no se puede anular.
  v_role := buscontrol.current_app_role();

  IF v_role IS NULL OR v_role NOT IN ('chofer', 'coordinador') THEN
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
    AND t.trip_date = buscontrol.lima_today();

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
$function$;

-- p_scan_role se conserva por compatibilidad con apps ya instaladas, pero se ignora:
-- el rol se deriva en el servidor.
CREATE OR REPLACE FUNCTION buscontrol.register_attendance(
  p_trip_id uuid,
  p_student_id uuid,
  p_event_type text,
  p_scan_role buscontrol.crew_role DEFAULT NULL::buscontrol.crew_role
)
RETURNS buscontrol.bus_attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_trip buscontrol.bus_trips;
  v_record buscontrol.bus_attendance_records;
  v_status text;
  v_has_boarding boolean;
  v_has_dropoff boolean;
  v_scan_role buscontrol.crew_role;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  IF NOT buscontrol.is_active_operator() THEN
    RAISE EXCEPTION 'No tienes permisos operativos.';
  END IF;

  SELECT * INTO v_trip
  FROM buscontrol.bus_trips
  WHERE id = p_trip_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no activo.';
  END IF;

  IF NOT buscontrol.user_assigned_to_bus(v_trip.bus_id) THEN
    RAISE EXCEPTION 'No estás asignado a este bus hoy.';
  END IF;

  IF NOT buscontrol.student_exists_active(p_student_id) THEN
    RAISE EXCEPTION 'Alumno no encontrado en padrón activo.';
  END IF;

  IF p_event_type NOT IN ('subio', 'bajo', 'ausente', 'manual') THEN
    RAISE EXCEPTION 'Tipo de evento inválido.';
  END IF;

  SELECT sts.status
  INTO v_status
  FROM buscontrol.student_trip_status sts
  WHERE sts.trip_id = p_trip_id
    AND sts.student_id = p_student_id;

  v_status := COALESCE(v_status, 'pending');

  IF p_event_type IN ('subio', 'manual', 'ausente') THEN
    IF v_status <> 'pending' THEN
      IF p_event_type = 'ausente' AND v_status = 'absent' THEN
        RAISE EXCEPTION 'Este alumno ya fue marcado como ausente en este tramo.';
      END IF;
      IF p_event_type IN ('subio', 'manual') THEN
        RAISE EXCEPTION 'Ya registrado';
      END IF;
      IF p_event_type = 'ausente' THEN
        RAISE EXCEPTION 'No se puede marcar ausente en el estado actual del alumno.';
      END IF;
    END IF;
  END IF;

  IF p_event_type = 'bajo' THEN
    IF v_status NOT IN ('onboard', 'returning') THEN
      IF v_status = 'pending' THEN
        RAISE EXCEPTION 'Primero debes registrar la entrada del alumno.';
      END IF;
      RAISE EXCEPTION 'La salida del alumno ya fue registrada.';
    END IF;

    SELECT
      bool_or(event_type IN ('subio', 'manual')),
      bool_or(event_type = 'bajo')
    INTO v_has_boarding, v_has_dropoff
    FROM buscontrol.bus_attendance_records
    WHERE trip_id = p_trip_id
      AND student_id = p_student_id
      AND voided_at IS NULL
      AND event_type IN ('subio', 'manual', 'bajo');

    IF NOT COALESCE(v_has_boarding, false) THEN
      RAISE EXCEPTION 'Primero debes registrar la entrada del alumno.';
    END IF;
    IF COALESCE(v_has_dropoff, false) THEN
      RAISE EXCEPTION 'La salida del alumno ya fue registrada.';
    END IF;
  END IF;

  SELECT bca.crew_role INTO v_scan_role
  FROM buscontrol.bus_crew_assignments bca
  WHERE bca.user_id = v_user
    AND bca.bus_id = v_trip.bus_id
    AND bca.assignment_date = v_trip.trip_date
    AND bca.is_active = true
  ORDER BY CASE bca.crew_role WHEN 'chofer' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_scan_role IS NULL THEN
    v_scan_role := CASE WHEN buscontrol.current_app_role() = 'asistenta'
      THEN 'asistenta'::buscontrol.crew_role
      ELSE 'chofer'::buscontrol.crew_role
    END;
  END IF;

  INSERT INTO buscontrol.bus_attendance_records (
    trip_id,
    student_id,
    event_type,
    scanned_at,
    scanned_by,
    scan_role
  ) VALUES (
    p_trip_id,
    p_student_id,
    p_event_type,
    now(),
    v_user,
    v_scan_role
  )
  RETURNING * INTO v_record;

  RETURN v_record;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya registrado';
END;
$function$;

COMMIT;
