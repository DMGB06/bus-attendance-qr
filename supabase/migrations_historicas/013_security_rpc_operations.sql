-- =============================================================================
-- Fase B — RPCs operaciones críticas
-- Pre-requisito: 012 aplicado.
-- Ejecutar en Supabase SQL Editor tras 012.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.get_user_bus_id_today()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT bca.bus_id
  FROM buscontrol.bus_crew_assignments bca
  WHERE bca.user_id = auth.uid()
    AND bca.assignment_date = CURRENT_DATE
    AND bca.is_active = true
  ORDER BY CASE bca.crew_role WHEN 'chofer' THEN 0 ELSE 1 END
  LIMIT 1
$$;

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

CREATE OR REPLACE FUNCTION buscontrol.student_exists_active(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.social_bus_escolar s
    WHERE s.id = p_student_id
      AND COALESCE(s.activo, true) = true
  )
$$;

CREATE OR REPLACE FUNCTION buscontrol.validate_can_start_turn(
  p_bus_id uuid,
  p_turn_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_direction text;
BEGIN
  IF p_turn_type NOT IN ('mañana', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica', 'tarde') THEN
    RAISE EXCEPTION 'Turno inválido.';
  END IF;

  v_direction := CASE WHEN p_turn_type = 'mañana' THEN 'recojo' ELSE 'retorno' END;

  IF v_direction = 'retorno' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM buscontrol.bus_trips
      WHERE bus_id = p_bus_id
        AND trip_date = CURRENT_DATE
        AND direction = 'recojo'
        AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Debes completar el viaje de recojo de la mañana antes de iniciar la tarde.';
    END IF;
  END IF;

  IF p_turn_type = 'tarde_secundaria' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM buscontrol.bus_trips
      WHERE bus_id = p_bus_id
        AND trip_date = CURRENT_DATE
        AND turn_type = 'tarde_primaria'
        AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Debes completar el viaje de tarde primaria antes de iniciar tarde secundaria.';
    END IF;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- start_trip
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.start_trip(p_turn_type text)
RETURNS buscontrol.bus_trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role buscontrol.app_role;
  v_bus_id uuid;
  v_direction text;
  v_trip buscontrol.bus_trips;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  v_role := buscontrol.current_app_role();
  IF v_role NOT IN ('chofer', 'coordinador') THEN
    RAISE EXCEPTION 'Solo el chofer puede iniciar el viaje.';
  END IF;

  v_bus_id := buscontrol.get_user_bus_id_today();
  IF v_bus_id IS NULL THEN
    RAISE EXCEPTION 'No tienes un bus asignado para hoy.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM buscontrol.bus_trips
    WHERE bus_id = v_bus_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Ya hay un viaje activo en esta unidad.';
  END IF;

  PERFORM buscontrol.validate_can_start_turn(v_bus_id, p_turn_type);

  v_direction := CASE WHEN p_turn_type = 'mañana' THEN 'recojo' ELSE 'retorno' END;

  INSERT INTO buscontrol.bus_trips (
    direction,
    turn_type,
    status,
    started_at,
    operator_id,
    started_by,
    bus_id,
    trip_date
  ) VALUES (
    v_direction,
    p_turn_type,
    'active',
    now(),
    v_user,
    v_user,
    v_bus_id,
    CURRENT_DATE
  )
  RETURNING * INTO v_trip;

  RETURN v_trip;
END;
$$;

-- -----------------------------------------------------------------------------
-- close_trip
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.close_trip(p_trip_id uuid)
RETURNS buscontrol.bus_trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role buscontrol.app_role;
  v_trip buscontrol.bus_trips;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  v_role := buscontrol.current_app_role();
  IF v_role NOT IN ('chofer', 'coordinador') THEN
    RAISE EXCEPTION 'Solo el chofer puede cerrar el viaje.';
  END IF;

  SELECT * INTO v_trip
  FROM buscontrol.bus_trips
  WHERE id = p_trip_id
    AND status = 'active'
    AND trip_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no encontrado o ya cerrado.';
  END IF;

  IF NOT buscontrol.user_assigned_to_bus(v_trip.bus_id) THEN
    RAISE EXCEPTION 'No estás asignado a este bus hoy.';
  END IF;

  UPDATE buscontrol.bus_trips
  SET status = 'completed', ended_at = now()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  RETURN v_trip;
END;
$$;

-- -----------------------------------------------------------------------------
-- register_attendance
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.register_attendance(
  p_trip_id uuid,
  p_student_id uuid,
  p_event_type text,
  p_scan_role buscontrol.crew_role DEFAULT NULL
)
RETURNS buscontrol.bus_attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_trip buscontrol.bus_trips;
  v_record buscontrol.bus_attendance_records;
  v_status text;
  v_has_boarding boolean;
  v_has_dropoff boolean;
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
    p_scan_role
  )
  RETURNING * INTO v_record;

  RETURN v_record;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya registrado';
END;
$$;

-- -----------------------------------------------------------------------------
-- publish_driver_location (GPS — reemplaza UPDATE directo en bus_trips)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.publish_driver_location(
  p_trip_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_trip buscontrol.bus_trips;
  v_recorded_at timestamptz := now();
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

  INSERT INTO buscontrol.bus_trip_locations (trip_id, lat, lng, recorded_at, recorded_by)
  VALUES (p_trip_id, p_lat, p_lng, v_recorded_at, v_user);

  UPDATE buscontrol.bus_trips
  SET last_lat = p_lat, last_lng = p_lng, last_location_at = v_recorded_at
  WHERE id = p_trip_id
    AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.get_user_bus_id_today() TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.user_assigned_to_bus(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.student_exists_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.validate_can_start_turn(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.start_trip(text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.close_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.register_attendance(uuid, uuid, text, buscontrol.crew_role) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.publish_driver_location(uuid, double precision, double precision) TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS: solo lectura directa; escritura vía RPC (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

-- Políticas MVP permisivas (anulan ops_read_* porque RLS es OR)
DROP POLICY IF EXISTS "allow all authenticated" ON buscontrol.bus_trips;
DROP POLICY IF EXISTS "allow all authenticated" ON buscontrol.bus_attendance_records;

DROP POLICY IF EXISTS "ops_manage_bus_trips" ON buscontrol.bus_trips;
DROP POLICY IF EXISTS "ops_read_bus_trips" ON buscontrol.bus_trips;

CREATE POLICY "ops_read_bus_trips" ON buscontrol.bus_trips
  FOR SELECT TO authenticated
  USING (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_manage_attendance" ON buscontrol.bus_attendance_records;
DROP POLICY IF EXISTS "ops_read_attendance" ON buscontrol.bus_attendance_records;

CREATE POLICY "ops_read_attendance" ON buscontrol.bus_attendance_records
  FOR SELECT TO authenticated
  USING (buscontrol.is_active_operator());
