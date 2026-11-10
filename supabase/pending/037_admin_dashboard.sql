-- =============================================================================
-- 037 - Dashboard del panel web (administrador)
-- NO aplicada en produccion. Requiere 026 (qr_codes), 028 (bus_beneficiaries) y 029 (_require_web_admin).
-- Solo AGREGA 1 funcion de lectura. No cambia tablas ni politicas.
--
-- admin_dashboard(): un solo jsonb con todo lo que muestra el Dashboard, solo administrador:
--   beneficiarios_activos, apoderados_activos, apoderados_con_cuenta,
--   carnets {vigente, vencido, perdido, sin_carnet} (solo beneficiarios activos; misma regla que admin_list_cards),
--   con_apoderado / sin_apoderado (beneficiarios activos con al menos un apoderado ACTIVO vinculado),
--   emitidos_mes, emitidos_mes_anterior (emisiones de carnet, cualquier estado posterior),
--   emitidos_por_mes: los ultimos 6 meses [{mes:'YYYY-MM', n}] con ceros incluidos.
--   Los meses y el anio se evaluan en America/Lima, no en UTC. Los alumnos de baja no cuentan.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_anio integer := extract(year FROM now() AT TIME ZONE 'America/Lima')::integer;
  v_mes date := date_trunc('month', now() AT TIME ZONE 'America/Lima')::date;
  v_res jsonb;
BEGIN
  PERFORM buscontrol._require_web_admin();

  WITH ben AS (
    SELECT b.student_id,
           CASE WHEN c.status = 'vigente' AND extract(year FROM c.issued_at AT TIME ZONE 'America/Lima')::integer >= v_anio THEN 'vigente'
                WHEN c.status = 'vigente' THEN 'vencido'
                WHEN c.status = 'reportado_perdido' THEN 'perdido'
                ELSE 'sin_carnet' END AS estado,
           EXISTS (
             SELECT 1 FROM buscontrol.bus_student_guardians sg
             JOIN buscontrol.bus_guardians g ON g.id = sg.guardian_id AND g.is_active
             WHERE sg.student_id = b.student_id
           ) AS tiene_apoderado
    FROM buscontrol.bus_beneficiaries b
    LEFT JOIN LATERAL (
      SELECT q.status, q.issued_at
      FROM buscontrol.qr_codes q
      WHERE q.student_id = b.student_id
      ORDER BY (q.status = 'vigente') DESC, q.issued_at DESC
      LIMIT 1
    ) c ON true
    WHERE b.is_active
  ),
  meses AS (
    SELECT (v_mes - (i || ' months')::interval)::date AS mes FROM generate_series(0, 5) i
  ),
  -- Una sola pasada por qr_codes (solo los ultimos 6 meses, usa el indice de issued_at), agrupada por mes de Lima.
  cuenta AS (
    SELECT date_trunc('month', q.issued_at AT TIME ZONE 'America/Lima')::date AS mes, count(*) AS n
    FROM buscontrol.qr_codes q
    WHERE q.issued_at >= ((v_mes - interval '5 months')::timestamp AT TIME ZONE 'America/Lima')
    GROUP BY 1
  ),
  emis AS (
    SELECT m.mes, coalesce(c.n, 0) AS n FROM meses m LEFT JOIN cuenta c ON c.mes = m.mes
  )
  SELECT jsonb_build_object(
    'beneficiarios_activos', (SELECT count(*) FROM ben),
    'apoderados_activos', (SELECT count(*) FROM buscontrol.bus_guardians WHERE is_active),
    'apoderados_con_cuenta', (SELECT count(*) FROM buscontrol.bus_guardians WHERE is_active AND auth_user_id IS NOT NULL),
    'carnets', jsonb_build_object(
      'vigente', (SELECT count(*) FROM ben WHERE estado = 'vigente'),
      'vencido', (SELECT count(*) FROM ben WHERE estado = 'vencido'),
      'perdido', (SELECT count(*) FROM ben WHERE estado = 'perdido'),
      'sin_carnet', (SELECT count(*) FROM ben WHERE estado = 'sin_carnet')),
    'con_apoderado', (SELECT count(*) FROM ben WHERE tiene_apoderado),
    'sin_apoderado', (SELECT count(*) FROM ben WHERE NOT tiene_apoderado),
    'emitidos_mes', (SELECT n FROM emis WHERE mes = v_mes),
    'emitidos_mes_anterior', (SELECT n FROM emis WHERE mes = (v_mes - interval '1 month')::date),
    'emitidos_por_mes', (SELECT jsonb_agg(jsonb_build_object('mes', to_char(mes, 'YYYY-MM'), 'n', n) ORDER BY mes) FROM emis)
  ) INTO v_res;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_dashboard() TO authenticated;

COMMIT;
