-- Consulta de incidencias del transporte. Requiere 026 (is_web_admin).
BEGIN;

CREATE FUNCTION buscontrol.admin_list_incidents(
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL,
  p_bus_id uuid DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_tipo text DEFAULT NULL,
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
  IF p_desde > p_hasta OR NOT isfinite(p_desde) OR NOT isfinite(p_hasta)
    OR p_turno NOT IN ('mañana', 'tarde', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica')
    OR p_tipo NOT IN ('ausencia', 'anulacion')
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20
    OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Filtros o paginación inválidos.' USING ERRCODE = '22023';
  END IF;

  RETURN (
    WITH filtradas AS MATERIALIZED (
      SELECT a.id, t.trip_date, coalesce(a.voided_at, a.scanned_at) AS incident_at
      FROM buscontrol.bus_attendance_records a
      JOIN buscontrol.bus_trips t ON t.id = a.trip_id
      WHERE (a.voided_at IS NOT NULL OR a.event_type = 'ausente')
        AND (p_tipo IS NULL OR (p_tipo = 'anulacion' AND a.voided_at IS NOT NULL)
                           OR (p_tipo = 'ausencia' AND a.voided_at IS NULL))
        AND (p_desde IS NULL OR t.trip_date >= p_desde)
        AND (p_hasta IS NULL OR t.trip_date <= p_hasta)
        AND (p_bus_id IS NULL OR t.bus_id = p_bus_id)
        AND (p_turno IS NULL OR t.turn_type = p_turno)
    ), pagina AS (
      SELECT id, trip_date, incident_at
      FROM filtradas
      ORDER BY trip_date DESC, incident_at DESC NULLS LAST, id
      LIMIT p_limit OFFSET p_offset
    ), filas AS (
      SELECT p.id, p.trip_date, p.incident_at, t.id AS trip_id, t.turn_type, t.direction,
             b.code AS bus_code, b.label AS bus_label, s.id AS student_id, s.nombre_alumno AS student_name,
             CASE WHEN a.voided_at IS NOT NULL THEN 'anulacion' ELSE 'ausencia' END AS tipo,
             a.event_type, a.scanned_at,
             NULLIF(btrim(op.full_name), '') AS operator_name,
             CASE WHEN a.voided_at IS NOT NULL THEN NULLIF(btrim(an.full_name), '') END AS voided_by_name,
             CASE WHEN a.voided_at IS NOT NULL THEN NULLIF(btrim(a.void_reason), '') END AS void_reason
      FROM pagina p
      JOIN buscontrol.bus_attendance_records a ON a.id = p.id
      JOIN buscontrol.bus_trips t ON t.id = a.trip_id
      LEFT JOIN buscontrol.bus_units b ON b.id = t.bus_id
      LEFT JOIN public.social_bus_escolar s ON s.id = a.student_id
      LEFT JOIN buscontrol.app_profiles op ON op.id = coalesce(a.scanned_by, a.operator_id)
      LEFT JOIN buscontrol.app_profiles an ON an.id = a.voided_by
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM filtradas),
      'filas', coalesce(
        jsonb_agg(to_jsonb(f) ORDER BY f.trip_date DESC, f.incident_at DESC NULLS LAST, f.id), '[]'::jsonb
      )
    )
    FROM filas f
  );
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_list_incidents(date, date, uuid, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_incidents(date, date, uuid, text, text, integer, integer) TO authenticated;

COMMIT;
