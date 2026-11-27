-- Resumen de solo lectura para el panel web. Requiere 026 (is_web_admin).
BEGIN;

CREATE FUNCTION buscontrol.admin_dashboard_operativo()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_hoy date := (transaction_timestamp() AT TIME ZONE 'America/Lima')::date;
BEGIN
  IF buscontrol.is_web_admin() IS DISTINCT FROM true
    OR auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Se requiere una sesión de administrador con autenticación de dos factores.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH viajes_diarios AS (
      SELECT trip_date,
             count(*) FILTER (WHERE status = 'active') AS en_curso,
             count(*) FILTER (WHERE status = 'completed') AS cerrados
      FROM buscontrol.bus_trips
      WHERE trip_date BETWEEN v_hoy - 6 AND v_hoy
      GROUP BY trip_date
    ), dias AS (
      SELECT v_hoy - i AS fecha,
             coalesce(v.en_curso, 0) AS en_curso,
             coalesce(v.cerrados, 0) AS cerrados
      FROM generate_series(0, 6) AS g(i)
      LEFT JOIN viajes_diarios v ON v.trip_date = v_hoy - i
    ), eventos AS (
      SELECT coalesce(sum(e.subidas), 0)::bigint AS subidas,
             coalesce(sum(e.ausencias), 0)::bigint AS ausencias,
             coalesce(sum(e.anulaciones), 0)::bigint AS anulaciones
      FROM buscontrol.bus_trips t
      CROSS JOIN LATERAL (
        SELECT count(DISTINCT a.student_id) FILTER (
                 WHERE a.voided_at IS NULL AND a.event_type IN ('subio', 'manual')
               ) AS subidas,
               count(*) FILTER (WHERE a.voided_at IS NULL AND a.event_type = 'ausente') AS ausencias,
               count(*) FILTER (WHERE a.voided_at IS NOT NULL) AS anulaciones
        FROM buscontrol.bus_attendance_records a
        WHERE a.trip_id = t.id
      ) e
      WHERE t.trip_date = v_hoy
    )
    SELECT jsonb_build_object(
      'fecha', to_char(v_hoy, 'YYYY-MM-DD'),
      'en_curso', hoy.en_curso,
      'cerrados', hoy.cerrados,
      'subidas', e.subidas,
      'ausencias', e.ausencias,
      'anulaciones', e.anulaciones,
      'dias', (
        SELECT jsonb_agg(jsonb_build_object(
          'fecha', to_char(d.fecha, 'YYYY-MM-DD'), 'en_curso', d.en_curso, 'cerrados', d.cerrados
        ) ORDER BY d.fecha)
        FROM dias d
      )
    )
    FROM eventos e CROSS JOIN dias hoy
    WHERE hoy.fecha = v_hoy
  );
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_dashboard_operativo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_dashboard_operativo() TO authenticated;

COMMIT;
