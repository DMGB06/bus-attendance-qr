-- Historial de asistencia del panel. Requiere 026 (is_web_admin).
BEGIN;

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
      SELECT a.id, a.trip_id, a.event_type, a.scanned_at, a.voided_at,
             CASE WHEN a.voided_at IS NOT NULL THEN a.void_reason END AS void_reason,
             t.trip_date, t.turn_type, t.direction, t.bus_id,
             (p_evento IS NULL OR a.event_type = p_evento OR (p_evento = 'subio' AND a.event_type = 'manual')) AS coincide
      FROM buscontrol.bus_attendance_records a
      JOIN buscontrol.bus_trips t ON t.id = a.trip_id
      WHERE a.student_id = p_student_id
        AND (p_desde IS NULL OR t.trip_date >= p_desde)
        AND (p_hasta IS NULL OR t.trip_date <= p_hasta)
        AND (p_turno IS NULL OR t.turn_type = p_turno)
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

REVOKE ALL ON FUNCTION buscontrol.admin_student_attendance(uuid, date, date, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_student_attendance(uuid, date, date, text, text, integer, integer) TO authenticated;

COMMIT;
