-- Consultas de viajes del panel. Requiere 029 (_require_web_admin).
BEGIN;

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
      FROM buscontrol.bus_trips t
      WHERE (p_desde IS NULL OR t.trip_date >= p_desde)
        AND (p_hasta IS NULL OR t.trip_date <= p_hasta)
        AND (p_bus_id IS NULL OR t.bus_id = p_bus_id)
        AND (p_turno IS NULL OR t.turn_type = p_turno)
        AND (p_sentido IS NULL OR t.direction = p_sentido)
        AND (p_estado IS NULL OR t.status = p_estado)
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

CREATE OR REPLACE FUNCTION buscontrol.admin_list_trip_buses()
RETURNS TABLE (id uuid, code text, label text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  PERFORM buscontrol._require_web_admin();
  IF auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Se requiere autenticación de dos factores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT b.id, b.code, b.label
  FROM buscontrol.bus_units b
  WHERE b.is_active OR EXISTS (SELECT 1 FROM buscontrol.bus_trips t WHERE t.bus_id = b.id)
  ORDER BY b.code, b.id;
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.admin_trip_detail(
  p_trip_id uuid,
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
  IF p_trip_id IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20
    OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 199980 THEN
    RAISE EXCEPTION 'Viaje o paginación inválidos.' USING ERRCODE = '22023';
  END IF;

  RETURN (
    WITH viaje AS (
      SELECT t.id, t.trip_date, t.turn_type, t.direction, t.status, t.started_at, t.ended_at,
             b.code AS bus_code, b.label AS bus_label
      FROM buscontrol.bus_trips t
      LEFT JOIN buscontrol.bus_units b ON b.id = t.bus_id
      WHERE t.id = p_trip_id
    ), alumnos AS (
      SELECT a.student_id,
             bool_or(a.event_type IN ('subio', 'manual')) AS subio,
             bool_or(a.event_type = 'bajo') AS bajo,
             bool_or(a.event_type = 'ausente') AS ausente
      FROM buscontrol.bus_attendance_records a
      WHERE a.trip_id = p_trip_id AND a.voided_at IS NULL
      GROUP BY a.student_id
    ), pagina AS (
      SELECT a.id, a.student_id, a.event_type, a.scanned_at, a.scanned_by, a.operator_id,
             a.voided_at, a.void_reason
      FROM buscontrol.bus_attendance_records a
      WHERE a.trip_id = p_trip_id
      ORDER BY a.scanned_at DESC NULLS LAST, a.id
      LIMIT p_limit OFFSET p_offset
    ), filas AS (
      SELECT p.id, p.student_id, s.nombre_alumno AS student_name, p.event_type, p.scanned_at,
             NULLIF(btrim(o.full_name), '') AS operator_name, p.voided_at,
             CASE WHEN p.voided_at IS NOT NULL THEN p.void_reason END AS void_reason
      FROM pagina p
      LEFT JOIN public.social_bus_escolar s ON s.id = p.student_id
      LEFT JOIN buscontrol.app_profiles o ON o.id = COALESCE(p.scanned_by, p.operator_id)
    )
    SELECT jsonb_build_object(
      'viaje', to_jsonb(v),
      'resumen', (
        SELECT jsonb_build_object(
          'subidas', count(*) FILTER (WHERE subio),
          'bajadas', count(*) FILTER (WHERE bajo),
          'ausencias', count(*) FILTER (WHERE ausente),
          'pendientes', count(*) FILTER (WHERE subio AND NOT bajo)
        )
        FROM alumnos
      ),
      'total', (SELECT count(*) FROM buscontrol.bus_attendance_records a WHERE a.trip_id = v.id),
      'filas', (
        SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.scanned_at DESC NULLS LAST, f.id), '[]'::jsonb)
        FROM filas f
      )
    )
    FROM viaje v
  );
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_list_trips(date, date, uuid, text, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.admin_list_trip_buses() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.admin_trip_detail(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_trips(date, date, uuid, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_trip_buses() TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.admin_trip_detail(uuid, integer, integer) TO authenticated;

COMMIT;
