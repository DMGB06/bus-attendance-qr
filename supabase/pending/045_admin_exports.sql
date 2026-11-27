-- Exportación de Viajes y Asistencia. Requiere 041 a 044.
BEGIN;

CREATE FUNCTION buscontrol._admin_trip_rows(
  p_desde date, p_hasta date, p_bus_id uuid, p_turno text, p_sentido text, p_estado text
)
RETURNS SETOF buscontrol.bus_trips
LANGUAGE sql STABLE
AS $$
  SELECT t.* FROM buscontrol.bus_trips t
  WHERE (p_desde IS NULL OR t.trip_date >= p_desde)
    AND (p_hasta IS NULL OR t.trip_date <= p_hasta)
    AND (p_bus_id IS NULL OR t.bus_id = p_bus_id)
    AND (p_turno IS NULL OR t.turn_type = p_turno)
    AND (p_sentido IS NULL OR t.direction = p_sentido)
    AND (p_estado IS NULL OR t.status = p_estado)
$$;

CREATE FUNCTION buscontrol._admin_student_attendance_rows(
  p_student_id uuid, p_desde date, p_hasta date, p_turno text, p_evento text
)
RETURNS TABLE (
  id uuid, trip_id uuid, event_type text, scanned_at timestamptz, voided_at timestamptz,
  void_reason text, trip_date date, turn_type text, direction text, bus_id uuid, coincide boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT a.id, a.trip_id, a.event_type, a.scanned_at, a.voided_at,
         CASE WHEN a.voided_at IS NOT NULL THEN a.void_reason END,
         t.trip_date, t.turn_type, t.direction, t.bus_id,
         (p_evento IS NULL OR a.event_type = p_evento OR (p_evento = 'subio' AND a.event_type = 'manual'))
  FROM buscontrol.bus_attendance_records a
  JOIN buscontrol.bus_trips t ON t.id = a.trip_id
  WHERE a.student_id = p_student_id
    AND (p_desde IS NULL OR t.trip_date >= p_desde)
    AND (p_hasta IS NULL OR t.trip_date <= p_hasta)
    AND (p_turno IS NULL OR t.turn_type = p_turno)
$$;

REVOKE ALL ON FUNCTION buscontrol._admin_trip_rows(date, date, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION buscontrol._admin_student_attendance_rows(uuid, date, date, text, text) FROM PUBLIC, anon, authenticated;

-- Las pantallas y la exportación comparten los predicados.
CREATE OR REPLACE FUNCTION buscontrol.admin_list_trips(
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL,
  p_bus_id uuid DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_sentido text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  PERFORM buscontrol._require_web_admin();
  IF auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Se requiere autenticación de dos factores.' USING ERRCODE = '42501';
  END IF;
  IF p_desde > p_hasta
    OR p_turno NOT IN ('mañana', 'tarde', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica')
    OR p_sentido NOT IN ('recojo', 'retorno')
    OR p_estado NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'Filtros de viaje inválidos.' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20
    OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 199980 THEN
    RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
  END IF;

  RETURN (
    WITH filtrados AS NOT MATERIALIZED (
      SELECT t.id, t.trip_date, t.turn_type, t.direction, t.status, t.started_at, t.ended_at, t.bus_id
      FROM buscontrol._admin_trip_rows(p_desde, p_hasta, p_bus_id, p_turno, p_sentido, p_estado) t
    ), pagina AS (
      SELECT *
      FROM filtrados
      ORDER BY trip_date DESC, started_at DESC NULLS LAST, id
      LIMIT p_limit OFFSET p_offset
    ), filas AS (
      SELECT p.id, p.trip_date, p.turn_type, p.direction, p.status, p.started_at, p.ended_at,
             b.code AS bus_code, b.label AS bus_label
      FROM pagina p
      LEFT JOIN buscontrol.bus_units b ON b.id = p.bus_id
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM filtrados),
      'filas', COALESCE(
        jsonb_agg(to_jsonb(f) ORDER BY f.trip_date DESC, f.started_at DESC NULLS LAST, f.id), '[]'::jsonb
      )
    )
    FROM filas f
  );
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.admin_student_attendance(
  p_student_id uuid,
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_evento text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF buscontrol.is_web_admin() IS DISTINCT FROM true
    OR auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Se requiere una sesión de administrador con autenticación de dos factores.' USING ERRCODE = '42501';
  END IF;
  IF p_student_id IS NULL
    OR p_desde > p_hasta
    OR p_turno NOT IN ('mañana', 'tarde', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica')
    OR p_evento NOT IN ('subio', 'manual', 'bajo', 'ausente')
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20
    OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Alumno, filtros o paginación inválidos.' USING ERRCODE = '22023';
  END IF;

  RETURN (
    WITH en_rango AS MATERIALIZED (
      SELECT *
      FROM buscontrol._admin_student_attendance_rows(p_student_id, p_desde, p_hasta, p_turno, p_evento)
    ), pagina AS (
      SELECT id, trip_id, event_type, scanned_at, voided_at, void_reason, trip_date, turn_type, direction, bus_id
      FROM en_rango
      WHERE coincide
      ORDER BY trip_date DESC, scanned_at DESC NULLS LAST, id
      LIMIT p_limit OFFSET p_offset
    ), filas AS (
      SELECT p.id, p.trip_id, p.event_type, p.scanned_at, p.voided_at, p.void_reason,
             p.trip_date, p.turn_type, p.direction, b.code AS bus_code, b.label AS bus_label
      FROM pagina p
      LEFT JOIN buscontrol.bus_units b ON b.id = p.bus_id
    )
    SELECT jsonb_build_object(
      'resumen', jsonb_build_object(
        'subidas', count(DISTINCT trip_id) FILTER (WHERE voided_at IS NULL AND event_type IN ('subio', 'manual')),
        'ausencias', count(DISTINCT trip_id) FILTER (WHERE voided_at IS NULL AND event_type = 'ausente')
      ),
      'total', count(*) FILTER (WHERE coincide),
      'filas', (
        SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.trip_date DESC, f.scanned_at DESC NULLS LAST, f.id), '[]'::jsonb)
        FROM filas f
      )
    )
    FROM en_rango
  );
END;
$$;

CREATE FUNCTION buscontrol.admin_prepare_export(
  p_origen text, p_id uuid DEFAULT NULL, p_desde date DEFAULT NULL, p_hasta date DEFAULT NULL,
  p_bus_id uuid DEFAULT NULL, p_turno text DEFAULT NULL, p_sentido text DEFAULT NULL,
  p_estado text DEFAULT NULL, p_evento text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_limite constant integer := 10000;
  v_max_bytes constant bigint := 4194304;
  v_total bigint;
  v_filas jsonb;
BEGIN
  IF buscontrol.is_web_admin() IS DISTINCT FROM true
    OR auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Se requiere una sesión de administrador con autenticación de dos factores.' USING ERRCODE = '42501';
  END IF;
  IF p_origen IS NULL OR p_origen NOT IN ('viajes', 'viaje', 'alumno')
    OR (p_origen = 'viajes') IS DISTINCT FROM (p_id IS NULL)
    OR p_desde > p_hasta
    OR p_turno NOT IN ('mañana', 'tarde', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica')
    OR p_sentido NOT IN ('recojo', 'retorno')
    OR p_estado NOT IN ('active', 'completed')
    OR p_evento NOT IN ('subio', 'manual', 'bajo', 'ausente')
    OR (p_origen <> 'viajes' AND (p_bus_id IS NOT NULL OR p_sentido IS NOT NULL OR p_estado IS NOT NULL))
    OR (p_origen <> 'alumno' AND p_evento IS NOT NULL)
    OR (p_origen = 'viaje' AND (p_desde IS NOT NULL OR p_hasta IS NOT NULL OR p_turno IS NOT NULL)) THEN
    RAISE EXCEPTION 'Origen o filtros inválidos.' USING ERRCODE = '22023';
  END IF;

  WITH viajes AS (
    SELECT t.id, t.trip_date, t.bus_id, t.turn_type, t.direction, t.status, t.started_at, t.ended_at
    FROM buscontrol._admin_trip_rows(p_desde, p_hasta, p_bus_id, p_turno, p_sentido, p_estado) t
    WHERE p_origen = 'viajes'
    ORDER BY t.trip_date DESC, t.started_at DESC NULLS LAST, t.id
    LIMIT v_limite + 1
  ), detalle AS (
    SELECT a.id, a.trip_id, a.student_id, a.event_type, a.scanned_at, a.voided_at,
           CASE WHEN a.voided_at IS NOT NULL THEN a.void_reason END AS void_reason,
           COALESCE(a.scanned_by, a.operator_id) AS operador
    FROM buscontrol.bus_attendance_records a
    WHERE p_origen = 'viaje' AND a.trip_id = p_id
    ORDER BY a.scanned_at DESC NULLS LAST, a.id
    LIMIT v_limite + 1
  ), asistencia AS (
    SELECT a.id, a.trip_date, a.bus_id, a.turn_type, a.direction, a.event_type, a.scanned_at,
           a.voided_at, a.void_reason
    FROM buscontrol._admin_student_attendance_rows(p_id, p_desde, p_hasta, p_turno, p_evento) a
    WHERE p_origen = 'alumno' AND a.coincide
    ORDER BY a.trip_date DESC, a.scanned_at DESC NULLS LAST, a.id
    LIMIT v_limite + 1
  ), registros AS (
    SELECT t.id, t.trip_date, t.bus_id, t.turn_type, t.direction, t.status, t.started_at, t.ended_at,
           t.started_at AS orden_hora, NULL::text AS event_type, NULL::timestamptz AS scanned_at,
           false AS anulado, NULL::text AS void_reason, NULL::text AS student_name, NULL::text AS operator_name
    FROM viajes t
    UNION ALL
    SELECT a.id, t.trip_date, t.bus_id, t.turn_type, t.direction, NULL, NULL, NULL,
           a.scanned_at, a.event_type, a.scanned_at, a.voided_at IS NOT NULL, a.void_reason,
           s.nombre_alumno, NULLIF(btrim(o.full_name), '')
    FROM detalle a
    JOIN buscontrol.bus_trips t ON t.id = a.trip_id
    LEFT JOIN public.social_bus_escolar s ON s.id = a.student_id
    LEFT JOIN buscontrol.app_profiles o ON o.id = a.operador
    UNION ALL
    SELECT a.id, a.trip_date, a.bus_id, a.turn_type, a.direction, NULL, NULL, NULL,
           a.scanned_at, a.event_type, a.scanned_at, a.voided_at IS NOT NULL, a.void_reason,
           s.nombre_alumno, NULL
    FROM asistencia a
    LEFT JOIN public.social_bus_escolar s ON s.id = p_id
  ), filas AS MATERIALIZED (
    SELECT r.id, r.orden_hora, r.trip_date, r.turn_type, r.direction, r.status, r.started_at, r.ended_at,
           r.event_type, r.scanned_at, r.anulado, r.void_reason, r.student_name, r.operator_name,
           b.code AS bus_code, b.label AS bus_label
    FROM registros r
    LEFT JOIN buscontrol.bus_units b ON b.id = r.bus_id
  ), magnitud AS (
    -- Espacio conservador para comillas duplicadas y las columnas de tamaño fijo del CSV.
    SELECT count(*) AS total, sum(256 + 2::bigint * (
      coalesce(octet_length(bus_code), 0)::bigint + coalesce(octet_length(bus_label), 0)
      + coalesce(octet_length(student_name), 0) + coalesce(octet_length(operator_name), 0)
      + coalesce(octet_length(void_reason), 0)
    )) AS bytes
    FROM filas
  )
  SELECT m.total, CASE WHEN m.total BETWEEN 1 AND v_limite AND m.bytes <= v_max_bytes THEN (
    SELECT jsonb_agg(to_jsonb(f) - 'id' - 'orden_hora' ORDER BY f.trip_date DESC, f.orden_hora DESC NULLS LAST, f.id)
    FROM filas f
  ) END
  INTO v_total, v_filas
  FROM magnitud m;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('estado', 'vacio');
  ELSIF v_total > v_limite THEN
    RETURN jsonb_build_object('estado', 'limite');
  ELSIF v_filas IS NULL THEN
    RETURN jsonb_build_object('estado', 'tamano');
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'csv_export', CASE WHEN p_origen = 'alumno' THEN 'social_bus_escolar' ELSE 'bus_trips' END, p_id,
    jsonb_build_object('origen', p_origen, 'count', v_total, 'filtros', jsonb_strip_nulls(jsonb_build_object(
      'desde', p_desde, 'hasta', p_hasta, 'bus', p_bus_id, 'turno', p_turno, 'sentido', p_sentido,
      'estado', p_estado, 'evento', p_evento
    ))));

  RETURN jsonb_build_object('estado', 'ok', 'filas', v_filas);
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_prepare_export(text, uuid, date, date, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_prepare_export(text, uuid, date, date, uuid, text, text, text, text) TO authenticated;

COMMIT;
