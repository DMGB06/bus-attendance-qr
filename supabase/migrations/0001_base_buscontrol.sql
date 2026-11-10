


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "buscontrol";


ALTER SCHEMA "buscontrol" OWNER TO "postgres";


CREATE TYPE "buscontrol"."app_role" AS ENUM (
    'chofer',
    'asistenta',
    'padre',
    'coordinador'
);


ALTER TYPE "buscontrol"."app_role" OWNER TO "postgres";


CREATE TYPE "buscontrol"."crew_role" AS ENUM (
    'chofer',
    'asistenta'
);


ALTER TYPE "buscontrol"."crew_role" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "ended_at" timestamp with time zone,
    "operator_id" "uuid",
    "trip_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "turn_type" "text",
    "bus_id" "uuid",
    "started_by" "uuid",
    "assistant_id" "uuid",
    "last_lat" double precision,
    "last_lng" double precision,
    "last_location_at" timestamp with time zone,
    CONSTRAINT "bus_trips_direction_check" CHECK (("direction" = ANY (ARRAY['recojo'::"text", 'retorno'::"text"]))),
    CONSTRAINT "bus_trips_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text"]))),
    CONSTRAINT "bus_trips_turn_type_check" CHECK ((("turn_type" IS NULL) OR ("turn_type" = ANY (ARRAY['mañana'::"text", 'tarde'::"text", 'tarde_primaria'::"text", 'tarde_secundaria'::"text", 'tarde_unica'::"text"]))))
);


ALTER TABLE "buscontrol"."bus_trips" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."close_trip"("p_trip_id" "uuid") RETURNS "buscontrol"."bus_trips"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role buscontrol.app_role;
  v_trip buscontrol.bus_trips;
  v_can_close boolean;
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
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no encontrado o ya cerrado.';
  END IF;

  v_can_close :=
    buscontrol.user_assigned_to_bus(v_trip.bus_id)
    OR EXISTS (
      SELECT 1
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = v_user
        AND bca.bus_id = v_trip.bus_id
        AND bca.assignment_date = v_trip.trip_date
        AND bca.is_active = true
    )
    OR v_trip.started_by = v_user
    OR v_trip.operator_id = v_user;

  IF NOT v_can_close THEN
    RAISE EXCEPTION 'No tienes permiso para cerrar este viaje.';
  END IF;

  UPDATE buscontrol.bus_trips
  SET status = 'completed', ended_at = now()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  RETURN v_trip;
END;
$$;


ALTER FUNCTION "buscontrol"."close_trip"("p_trip_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "buscontrol"."close_trip"("p_trip_id" "uuid") IS 'Cierra viaje activo: asignación hoy/fecha del viaje, coordinador, o quien lo inició.';



CREATE OR REPLACE FUNCTION "buscontrol"."count_active_bus_units"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT count(*)::integer
  FROM buscontrol.bus_units
  WHERE is_active = true;
$$;


ALTER FUNCTION "buscontrol"."count_active_bus_units"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."current_app_role"() RETURNS "buscontrol"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT app_role
  FROM buscontrol.app_profiles
  WHERE id = auth.uid()
    AND is_active = true
$$;


ALTER FUNCTION "buscontrol"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."get_default_pilot_bus_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT bu.id
  FROM buscontrol.bus_units bu
  WHERE bu.is_active = true
  ORDER BY bu.code
  LIMIT 1;
$$;


ALTER FUNCTION "buscontrol"."get_default_pilot_bus_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."get_my_guardian_students"() RETURNS SETOF "public"."social_bus_escolar"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT s.*
  FROM public.social_bus_escolar s
  WHERE buscontrol.is_guardian_of_student(s.id)
  ORDER BY s.nombre_alumno;
$$;


ALTER FUNCTION "buscontrol"."get_my_guardian_students"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."get_operator_activity_range"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("record_id" "uuid", "trip_id" "uuid", "trip_date" "date", "trip_direction" "text", "turn_type" "text", "trip_status" "text", "student_id" "uuid", "student_name" "text", "event_type" "text", "scanned_at" timestamp with time zone, "scanned_by" "uuid", "voided_at" timestamp with time zone, "is_offline_sync" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."get_operator_activity_range"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "buscontrol"."get_operator_activity_range"("p_start_date" "date", "p_end_date" "date") IS 'Historial de asistencia para operadores: máx. 7 días, solo buses asignados por fecha (bus_crew_assignments).';



CREATE TABLE IF NOT EXISTS "buscontrol"."app_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "phone" "text",
    "app_role" "buscontrol"."app_role",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."app_profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."get_own_profile"() RETURNS "buscontrol"."app_profiles"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT *
  FROM buscontrol.app_profiles
  WHERE id = auth.uid();
$$;


ALTER FUNCTION "buscontrol"."get_own_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."get_user_bus_id_today"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."get_user_bus_id_today"() OWNER TO "postgres";


COMMENT ON FUNCTION "buscontrol"."get_user_bus_id_today"() IS 'Bus del operador hoy: asignación crew o auto BUS único en piloto.';



CREATE OR REPLACE FUNCTION "buscontrol"."guardian_user_ids_for_student"("p_student_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT DISTINCT uid
  FROM (
    SELECT sg.guardian_user_id AS uid
    FROM buscontrol.student_guardians sg
    WHERE sg.student_id = p_student_id

    UNION

    SELECT bg.auth_user_id AS uid
    FROM buscontrol.bus_student_guardians bsg
    JOIN buscontrol.bus_guardians bg ON bg.id = bsg.guardian_id
    WHERE bsg.student_id = p_student_id
      AND bg.is_active = true
      AND bg.auth_user_id IS NOT NULL
  ) guardians
  WHERE uid IS NOT NULL;
$$;


ALTER FUNCTION "buscontrol"."guardian_user_ids_for_student"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."handle_new_app_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
BEGIN
  INSERT INTO buscontrol.app_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "buscontrol"."handle_new_app_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."is_active_operator"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
$$;


ALTER FUNCTION "buscontrol"."is_active_operator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."is_guardian_of_student"("p_student_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."is_guardian_of_student"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."is_guardian_of_trip"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."is_guardian_of_trip"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."is_single_bus_pilot_mode"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT buscontrol.count_active_bus_units() = 1;
$$;


ALTER FUNCTION "buscontrol"."is_single_bus_pilot_mode"() OWNER TO "postgres";


COMMENT ON FUNCTION "buscontrol"."is_single_bus_pilot_mode"() IS 'True cuando hay exactamente 1 bus_units activo (piloto Cerro Azul).';



CREATE OR REPLACE FUNCTION "buscontrol"."protect_app_profile_sensitive_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.app_role IS DISTINCT FROM OLD.app_role THEN
    RAISE EXCEPTION 'No puedes modificar tu rol de aplicación.';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'No puedes modificar el estado activo de tu cuenta.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "buscontrol"."protect_app_profile_sensitive_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."publish_driver_location"("p_trip_id" "uuid", "p_lat" double precision, "p_lng" double precision) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."publish_driver_location"("p_trip_id" "uuid", "p_lat" double precision, "p_lng" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."recalc_student_trip_status"("p_trip_id" "uuid", "p_student_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."recalc_student_trip_status"("p_trip_id" "uuid", "p_student_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "lat" double precision,
    "lng" double precision,
    "operator_id" "uuid",
    "is_offline_sync" boolean DEFAULT false,
    "scanned_by" "uuid",
    "scan_role" "buscontrol"."crew_role",
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    CONSTRAINT "bus_attendance_records_event_type_check" CHECK (("event_type" = ANY (ARRAY['subio'::"text", 'bajo'::"text", 'ausente'::"text", 'manual'::"text"])))
);


ALTER TABLE "buscontrol"."bus_attendance_records" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."register_attendance"("p_trip_id" "uuid", "p_student_id" "uuid", "p_event_type" "text", "p_scan_role" "buscontrol"."crew_role" DEFAULT NULL::"buscontrol"."crew_role") RETURNS "buscontrol"."bus_attendance_records"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."register_attendance"("p_trip_id" "uuid", "p_student_id" "uuid", "p_event_type" "text", "p_scan_role" "buscontrol"."crew_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."start_trip"("p_turn_type" "text") RETURNS "buscontrol"."bus_trips"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role buscontrol.app_role;
  v_bus_id uuid;
  v_direction text;
  v_trip buscontrol.bus_trips;
  v_trip_date date := (timezone('America/Lima', now()))::date;
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

  IF p_turn_type NOT IN ('mañana', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica', 'tarde') THEN
    RAISE EXCEPTION 'Tipo de turno inválido.';
  END IF;

  v_direction := CASE
    WHEN p_turn_type = 'mañana' THEN 'recojo'
    ELSE 'retorno'
  END;

  -- Sin validar "ya completaste este turno hoy" — solo sugerencias en la app.

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
    v_trip_date
  )
  RETURNING * INTO v_trip;

  RETURN v_trip;
END;
$$;


ALTER FUNCTION "buscontrol"."start_trip"("p_turn_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."student_exists_active"("p_student_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.social_bus_escolar s
    WHERE s.id = p_student_id
      AND COALESCE(s.activo, true) = true
  )
$$;


ALTER FUNCTION "buscontrol"."student_exists_active"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."sync_student_trip_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_direction text;
  v_trip_date date;
  v_status text;
BEGIN
  IF NEW.voided_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT direction, trip_date INTO v_direction, v_trip_date
  FROM buscontrol.bus_trips WHERE id = NEW.trip_id;

  v_status := CASE
    WHEN NEW.event_type = 'ausente' THEN 'absent'
    WHEN NEW.event_type IN ('subio', 'manual') AND v_direction = 'recojo' THEN 'onboard'
    WHEN NEW.event_type = 'bajo' AND v_direction = 'recojo' THEN 'at_school'
    WHEN NEW.event_type IN ('subio', 'manual') AND v_direction = 'retorno' THEN 'returning'
    WHEN NEW.event_type = 'bajo' AND v_direction = 'retorno' THEN 'dropped_off'
    ELSE 'pending'
  END;

  INSERT INTO buscontrol.student_trip_status (
    student_id, trip_id, trip_date, direction, status,
    last_event_type, last_event_at, updated_at
  ) VALUES (
    NEW.student_id, NEW.trip_id, v_trip_date, v_direction, v_status,
    NEW.event_type, COALESCE(NEW.scanned_at, now()), now()
  )
  ON CONFLICT (student_id, trip_id) DO UPDATE SET
    status = EXCLUDED.status,
    last_event_type = EXCLUDED.last_event_type,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = now();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "buscontrol"."sync_student_trip_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."update_own_profile"("p_full_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "buscontrol"."app_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile buscontrol.app_profiles;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  UPDATE buscontrol.app_profiles
  SET
    full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
    phone = COALESCE(NULLIF(trim(p_phone), ''), phone),
    updated_at = now()
  WHERE id = v_user
    AND is_active = true
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado o cuenta inactiva.';
  END IF;

  RETURN v_profile;
END;
$$;


ALTER FUNCTION "buscontrol"."update_own_profile"("p_full_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."user_assigned_to_bus"("p_bus_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."user_assigned_to_bus"("p_bus_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "buscontrol"."user_assigned_to_bus"("p_bus_id" "uuid") IS 'Permiso operar bus: crew hoy, coordinador, o piloto un solo bus.';



CREATE OR REPLACE FUNCTION "buscontrol"."user_has_pilot_bus_access"("p_bus_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
  SELECT
    buscontrol.is_single_bus_pilot_mode()
    AND p_bus_id = buscontrol.get_default_pilot_bus_id()
    AND buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador');
$$;


ALTER FUNCTION "buscontrol"."user_has_pilot_bus_access"("p_bus_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "buscontrol"."validate_can_start_turn"("p_bus_id" "uuid", "p_turn_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
    AS $$
DECLARE
  v_direction text;
BEGIN
  IF p_turn_type NOT IN ('mañana', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica', 'tarde') THEN
    RAISE EXCEPTION 'Turno inválido.';
  END IF;

  v_direction := CASE WHEN p_turn_type = 'mañana' THEN 'recojo' ELSE 'retorno' END;

  -- No repetir el mismo tramo si ya se cerró hoy en esta unidad.
  IF EXISTS (
    SELECT 1
    FROM buscontrol.bus_trips
    WHERE bus_id = p_bus_id
      AND trip_date = CURRENT_DATE
      AND turn_type = p_turn_type
      AND status = 'completed'
  ) THEN
    CASE p_turn_type
      WHEN 'mañana' THEN
        RAISE EXCEPTION 'Ya registraste el recojo de mañana hoy. Inicia el viaje de tarde.';
      WHEN 'tarde_primaria' THEN
        RAISE EXCEPTION 'Ya completaste tarde primaria hoy.';
      WHEN 'tarde_secundaria' THEN
        RAISE EXCEPTION 'Ya completaste tarde secundaria hoy.';
      WHEN 'tarde_unica' THEN
        RAISE EXCEPTION 'Ya completaste el viaje único de tarde hoy.';
      ELSE
        RAISE EXCEPTION 'Ya completaste este tramo de tarde hoy.';
    END CASE;
  END IF;

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


ALTER FUNCTION "buscontrol"."validate_can_start_turn"("p_bus_id" "uuid", "p_turn_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "buscontrol"."validate_can_start_turn"("p_bus_id" "uuid", "p_turn_type" "text") IS 'Valida orden de turnos y bloquea duplicar el mismo turn_type completado el mismo día.';



CREATE OR REPLACE FUNCTION "buscontrol"."void_attendance_record"("p_record_id" "uuid", "p_reason" "text") RETURNS "buscontrol"."bus_attendance_records"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'buscontrol', 'public'
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


ALTER FUNCTION "buscontrol"."void_attendance_record"("p_record_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_crew_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bus_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "crew_role" "buscontrol"."crew_role" NOT NULL,
    "assignment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."bus_crew_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_guardians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "phone_normalized" "text",
    "dni" "text",
    "email" "text",
    "auth_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."bus_guardians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_student_guardians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "guardian_id" "uuid" NOT NULL,
    "relationship" "text" DEFAULT 'apoderado'::"text" NOT NULL,
    "is_primary" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."bus_student_guardians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_trip_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_by" "uuid"
);


ALTER TABLE "buscontrol"."bus_trip_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."bus_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "plate" "text",
    "label" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."bus_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."device_push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "platform" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."device_push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."guardian_notification_preferences" (
    "guardian_user_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guardian_notification_preferences_event_key_check" CHECK (("event_key" = ANY (ARRAY['recojo_subio'::"text", 'recojo_bajo'::"text", 'retorno_subio'::"text", 'retorno_bajo'::"text"])))
);


ALTER TABLE "buscontrol"."guardian_notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guardian_user_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "delivery_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attendance_record_id" "uuid"
);


ALTER TABLE "buscontrol"."notification_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."push_webhook_receipts" (
    "attendance_record_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."push_webhook_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."student_guardians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "guardian_user_id" "uuid" NOT NULL,
    "relationship" "text" DEFAULT 'apoderado'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."student_guardians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "buscontrol"."student_trip_status" (
    "student_id" "uuid" NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "trip_date" "date" NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" NOT NULL,
    "last_event_type" "text",
    "last_event_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "buscontrol"."student_trip_status" OWNER TO "postgres";


ALTER TABLE ONLY "buscontrol"."app_profiles"
    ADD CONSTRAINT "app_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_attendance_records"
    ADD CONSTRAINT "bus_attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_crew_assignments"
    ADD CONSTRAINT "bus_crew_assignments_bus_id_user_id_assignment_date_crew_ro_key" UNIQUE ("bus_id", "user_id", "assignment_date", "crew_role");



ALTER TABLE ONLY "buscontrol"."bus_crew_assignments"
    ADD CONSTRAINT "bus_crew_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_guardians"
    ADD CONSTRAINT "bus_guardians_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "buscontrol"."bus_guardians"
    ADD CONSTRAINT "bus_guardians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_student_guardians"
    ADD CONSTRAINT "bus_student_guardians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_student_guardians"
    ADD CONSTRAINT "bus_student_guardians_student_id_guardian_id_key" UNIQUE ("student_id", "guardian_id");



ALTER TABLE ONLY "buscontrol"."bus_trip_locations"
    ADD CONSTRAINT "bus_trip_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_trips"
    ADD CONSTRAINT "bus_trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."bus_units"
    ADD CONSTRAINT "bus_units_code_key" UNIQUE ("code");



ALTER TABLE ONLY "buscontrol"."bus_units"
    ADD CONSTRAINT "bus_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."device_push_tokens"
    ADD CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."device_push_tokens"
    ADD CONSTRAINT "device_push_tokens_user_id_expo_push_token_key" UNIQUE ("user_id", "expo_push_token");



ALTER TABLE ONLY "buscontrol"."guardian_notification_preferences"
    ADD CONSTRAINT "guardian_notification_preferences_pkey" PRIMARY KEY ("guardian_user_id", "event_key");



ALTER TABLE ONLY "buscontrol"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."push_webhook_receipts"
    ADD CONSTRAINT "push_webhook_receipts_pkey" PRIMARY KEY ("attendance_record_id", "event_key");



ALTER TABLE ONLY "buscontrol"."student_guardians"
    ADD CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "buscontrol"."student_guardians"
    ADD CONSTRAINT "student_guardians_student_id_guardian_user_id_key" UNIQUE ("student_id", "guardian_user_id");



ALTER TABLE ONLY "buscontrol"."student_trip_status"
    ADD CONSTRAINT "student_trip_status_pkey" PRIMARY KEY ("student_id", "trip_id");



CREATE UNIQUE INDEX "bus_attendance_unique_active_event" ON "buscontrol"."bus_attendance_records" USING "btree" ("trip_id", "student_id", "event_type") WHERE ("voided_at" IS NULL);



CREATE UNIQUE INDEX "bus_guardians_phone_norm_uidx" ON "buscontrol"."bus_guardians" USING "btree" ("phone_normalized") WHERE (("phone_normalized" IS NOT NULL) AND ("phone_normalized" <> ''::"text"));



CREATE INDEX "idx_app_profiles_app_role" ON "buscontrol"."app_profiles" USING "btree" ("app_role") WHERE ("app_role" IS NOT NULL);



CREATE INDEX "idx_notification_log_attendance_record" ON "buscontrol"."notification_log" USING "btree" ("attendance_record_id") WHERE ("attendance_record_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_bus_trips_one_active_per_bus" ON "buscontrol"."bus_trips" USING "btree" ("bus_id") WHERE ("status" = 'active'::"text");



-- LIMPIADO ANTES DE PUBLICAR: la URL y la llave del trigger son marcadores. En cada proyecto hay que poner la URL propia y la llave
-- secreta real (no se guarda en el repo). Si ya existe el trigger, no recrearlo desde este archivo sin corregir esos dos valores.
CREATE OR REPLACE TRIGGER "attendance-push" AFTER INSERT ON "buscontrol"."bus_attendance_records" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://TU-PROYECTO.supabase.co/functions/v1/send-attendance-push', 'POST', '{"Content-type":"application/json","apikey":"REEMPLAZAR_CON_LA_LLAVE_SECRETA_DEL_PROYECTO"}', '{}', '10000');



CREATE OR REPLACE TRIGGER "trg_protect_app_profile" BEFORE UPDATE ON "buscontrol"."app_profiles" FOR EACH ROW EXECUTE FUNCTION "buscontrol"."protect_app_profile_sensitive_columns"();



CREATE OR REPLACE TRIGGER "trg_sync_student_trip_status" AFTER INSERT ON "buscontrol"."bus_attendance_records" FOR EACH ROW EXECUTE FUNCTION "buscontrol"."sync_student_trip_status"();



ALTER TABLE ONLY "buscontrol"."app_profiles"
    ADD CONSTRAINT "app_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "buscontrol"."bus_attendance_records"
    ADD CONSTRAINT "bus_attendance_records_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "buscontrol"."bus_attendance_records"
    ADD CONSTRAINT "bus_attendance_records_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "auth"."users"("id");






ALTER TABLE ONLY "buscontrol"."bus_attendance_records"
    ADD CONSTRAINT "bus_attendance_records_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "buscontrol"."bus_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "buscontrol"."bus_attendance_records"
    ADD CONSTRAINT "bus_attendance_records_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."bus_crew_assignments"
    ADD CONSTRAINT "bus_crew_assignments_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buscontrol"."bus_units"("id");



ALTER TABLE ONLY "buscontrol"."bus_crew_assignments"
    ADD CONSTRAINT "bus_crew_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."bus_guardians"
    ADD CONSTRAINT "bus_guardians_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "buscontrol"."bus_student_guardians"
    ADD CONSTRAINT "bus_student_guardians_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "buscontrol"."bus_guardians"("id") ON DELETE CASCADE;






ALTER TABLE ONLY "buscontrol"."bus_trip_locations"
    ADD CONSTRAINT "bus_trip_locations_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."bus_trip_locations"
    ADD CONSTRAINT "bus_trip_locations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "buscontrol"."bus_trips"("id");



ALTER TABLE ONLY "buscontrol"."bus_trips"
    ADD CONSTRAINT "bus_trips_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."bus_trips"
    ADD CONSTRAINT "bus_trips_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buscontrol"."bus_units"("id");



ALTER TABLE ONLY "buscontrol"."bus_trips"
    ADD CONSTRAINT "bus_trips_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."bus_trips"
    ADD CONSTRAINT "bus_trips_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."device_push_tokens"
    ADD CONSTRAINT "device_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "buscontrol"."guardian_notification_preferences"
    ADD CONSTRAINT "guardian_notification_preferences_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "buscontrol"."notification_log"
    ADD CONSTRAINT "notification_log_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "buscontrol"."bus_attendance_records"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "buscontrol"."notification_log"
    ADD CONSTRAINT "notification_log_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "auth"."users"("id");






ALTER TABLE ONLY "buscontrol"."push_webhook_receipts"
    ADD CONSTRAINT "push_webhook_receipts_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "buscontrol"."bus_attendance_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "buscontrol"."student_guardians"
    ADD CONSTRAINT "student_guardians_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "auth"."users"("id");









ALTER TABLE ONLY "buscontrol"."student_trip_status"
    ADD CONSTRAINT "student_trip_status_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "buscontrol"."bus_trips"("id");



ALTER TABLE "buscontrol"."app_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_attendance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_crew_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_guardians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_student_guardians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_trip_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."bus_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coordinator_manage_bus_guardians" ON "buscontrol"."bus_guardians" TO "authenticated" USING (("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role")) WITH CHECK (("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role"));



CREATE POLICY "coordinator_manage_bus_student_guardians" ON "buscontrol"."bus_student_guardians" TO "authenticated" USING (("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role")) WITH CHECK (("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role"));



CREATE POLICY "coordinator_manage_guardians" ON "buscontrol"."student_guardians" TO "authenticated" USING (("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role")) WITH CHECK (("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role"));



ALTER TABLE "buscontrol"."device_push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guardian_manage_own_notification_prefs" ON "buscontrol"."guardian_notification_preferences" TO "authenticated" USING (("guardian_user_id" = "auth"."uid"())) WITH CHECK (("guardian_user_id" = "auth"."uid"()));



CREATE POLICY "guardian_manage_own_push_tokens" ON "buscontrol"."device_push_tokens" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "buscontrol"."guardian_notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guardian_read_linked_attendance" ON "buscontrol"."bus_attendance_records" FOR SELECT TO "authenticated" USING ("buscontrol"."is_guardian_of_student"("student_id"));



CREATE POLICY "guardian_read_linked_status" ON "buscontrol"."student_trip_status" FOR SELECT TO "authenticated" USING ("buscontrol"."is_guardian_of_student"("student_id"));



CREATE POLICY "guardian_read_linked_trips" ON "buscontrol"."bus_trips" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "buscontrol"."student_trip_status" "sts"
  WHERE (("sts"."trip_id" = "bus_trips"."id") AND "buscontrol"."is_guardian_of_student"("sts"."student_id")))) OR (EXISTS ( SELECT 1
   FROM "buscontrol"."bus_attendance_records" "ar"
  WHERE (("ar"."trip_id" = "bus_trips"."id") AND "buscontrol"."is_guardian_of_student"("ar"."student_id"))))));



CREATE POLICY "guardian_read_own_bus_guardian" ON "buscontrol"."bus_guardians" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "guardian_read_own_links" ON "buscontrol"."student_guardians" FOR SELECT TO "authenticated" USING (("guardian_user_id" = "auth"."uid"()));



CREATE POLICY "guardian_read_own_notification_log" ON "buscontrol"."notification_log" FOR SELECT TO "authenticated" USING (("guardian_user_id" = "auth"."uid"()));



CREATE POLICY "guardian_read_own_student_links" ON "buscontrol"."bus_student_guardians" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "buscontrol"."bus_guardians" "bg"
  WHERE (("bg"."id" = "bus_student_guardians"."guardian_id") AND ("bg"."auth_user_id" = "auth"."uid"()) AND ("bg"."is_active" = true)))));



ALTER TABLE "buscontrol"."notification_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ops_read_attendance" ON "buscontrol"."bus_attendance_records" FOR SELECT TO "authenticated" USING ("buscontrol"."is_active_operator"());



CREATE POLICY "ops_read_bus_guardians" ON "buscontrol"."bus_guardians" FOR SELECT TO "authenticated" USING ("buscontrol"."is_active_operator"());



CREATE POLICY "ops_read_bus_student_guardians" ON "buscontrol"."bus_student_guardians" FOR SELECT TO "authenticated" USING ("buscontrol"."is_active_operator"());



CREATE POLICY "ops_read_bus_trips" ON "buscontrol"."bus_trips" FOR SELECT TO "authenticated" USING ("buscontrol"."is_active_operator"());



CREATE POLICY "ops_read_own_crew" ON "buscontrol"."bus_crew_assignments" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("buscontrol"."current_app_role"() = 'coordinador'::"buscontrol"."app_role")));



CREATE POLICY "ops_read_student_guardians" ON "buscontrol"."student_guardians" FOR SELECT TO "authenticated" USING ("buscontrol"."is_active_operator"());



CREATE POLICY "ops_read_student_trip_status" ON "buscontrol"."student_trip_status" FOR SELECT TO "authenticated" USING ("buscontrol"."is_active_operator"());



CREATE POLICY "ops_read_trip_locations" ON "buscontrol"."bus_trip_locations" FOR SELECT TO "authenticated" USING (("buscontrol"."is_active_operator"() OR "buscontrol"."is_guardian_of_trip"("trip_id")));



ALTER TABLE "buscontrol"."push_webhook_receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_bus_units" ON "buscontrol"."bus_units" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_own_app_profile" ON "buscontrol"."app_profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "service_role_notification_log" ON "buscontrol"."notification_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_notification_prefs" ON "buscontrol"."guardian_notification_preferences" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_push_tokens" ON "buscontrol"."device_push_tokens" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_push_webhook_receipts" ON "buscontrol"."push_webhook_receipts" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "buscontrol"."student_guardians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "buscontrol"."student_trip_status" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "buscontrol" TO "anon";
GRANT USAGE ON SCHEMA "buscontrol" TO "authenticated";
GRANT USAGE ON SCHEMA "buscontrol" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "buscontrol"."bus_trips" TO "anon";
GRANT ALL ON TABLE "buscontrol"."bus_trips" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_trips" TO "service_role";



GRANT ALL ON FUNCTION "buscontrol"."close_trip"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."count_active_bus_units"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."current_app_role"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."get_default_pilot_bus_id"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."get_my_guardian_students"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."get_operator_activity_range"("p_start_date" "date", "p_end_date" "date") TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."app_profiles" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."app_profiles" TO "service_role";



REVOKE ALL ON FUNCTION "buscontrol"."get_own_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "buscontrol"."get_own_profile"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."get_user_bus_id_today"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."guardian_user_ids_for_student"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "buscontrol"."guardian_user_ids_for_student"("p_student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "buscontrol"."is_guardian_of_student"("p_student_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."is_guardian_of_trip"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."is_single_bus_pilot_mode"() TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."publish_driver_location"("p_trip_id" "uuid", "p_lat" double precision, "p_lng" double precision) TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."recalc_student_trip_status"("p_trip_id" "uuid", "p_student_id" "uuid") TO "authenticated";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "buscontrol"."bus_attendance_records" TO "anon";
GRANT ALL ON TABLE "buscontrol"."bus_attendance_records" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_attendance_records" TO "service_role";



GRANT ALL ON FUNCTION "buscontrol"."register_attendance"("p_trip_id" "uuid", "p_student_id" "uuid", "p_event_type" "text", "p_scan_role" "buscontrol"."crew_role") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."start_trip"("p_turn_type" "text") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."student_exists_active"("p_student_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."update_own_profile"("p_full_name" "text", "p_phone" "text") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."user_assigned_to_bus"("p_bus_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."user_has_pilot_bus_access"("p_bus_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."validate_can_start_turn"("p_bus_id" "uuid", "p_turn_type" "text") TO "authenticated";



GRANT ALL ON FUNCTION "buscontrol"."void_attendance_record"("p_record_id" "uuid", "p_reason" "text") TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."bus_crew_assignments" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_crew_assignments" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "buscontrol"."bus_guardians" TO "anon";
GRANT ALL ON TABLE "buscontrol"."bus_guardians" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_guardians" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "buscontrol"."bus_student_guardians" TO "anon";
GRANT ALL ON TABLE "buscontrol"."bus_student_guardians" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_student_guardians" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."bus_trip_locations" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_trip_locations" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."bus_units" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."bus_units" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."device_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."device_push_tokens" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."guardian_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."guardian_notification_preferences" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."notification_log" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."push_webhook_receipts" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."push_webhook_receipts" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."student_guardians" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."student_guardians" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "buscontrol"."student_trip_status" TO "authenticated";
GRANT ALL ON TABLE "buscontrol"."student_trip_status" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "buscontrol" GRANT USAGE ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "buscontrol" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "buscontrol" GRANT ALL ON TABLES TO "service_role";




