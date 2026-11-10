-- Fase 6.7 — Observabilidad push y cola offline
-- Ejecutar tras 009_push_notifications.sql

-- Vista: resumen diario de entregas push
CREATE OR REPLACE VIEW buscontrol.v_push_delivery_daily AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'America/Lima')::date AS day,
  delivery_status,
  event_key,
  count(*) AS total
FROM buscontrol.notification_log
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

COMMENT ON VIEW buscontrol.v_push_delivery_daily IS
  'Conteo diario de notificaciones push por estado y tipo de evento.';

-- Vista: fallos recientes con contexto del alumno
CREATE OR REPLACE VIEW buscontrol.v_push_delivery_failures AS
SELECT
  nl.id,
  nl.created_at,
  nl.guardian_user_id,
  ap.full_name AS guardian_name,
  ap.email AS guardian_email,
  nl.student_id,
  s.nombre_alumno AS student_name,
  nl.event_key,
  nl.title,
  nl.body,
  nl.delivery_status
FROM buscontrol.notification_log nl
LEFT JOIN buscontrol.app_profiles ap ON ap.id = nl.guardian_user_id
LEFT JOIN public.social_bus_escolar s ON s.id = nl.student_id
WHERE nl.delivery_status IN ('failed', 'skipped')
ORDER BY nl.created_at DESC;

COMMENT ON VIEW buscontrol.v_push_delivery_failures IS
  'Últimos envíos push fallidos u omitidos (sin token, preferencia desactivada, etc.).';

-- Vista: cola offline pendiente de sincronizar (operadores)
CREATE OR REPLACE VIEW buscontrol.v_offline_sync_pending AS
SELECT
  ar.id,
  ar.trip_id,
  bt.direction,
  bt.trip_date,
  ar.student_id,
  s.nombre_alumno AS student_name,
  ar.event_type,
  ar.scanned_at,
  ar.operator_id,
  op.full_name AS operator_name,
  ar.is_offline_sync
FROM buscontrol.bus_attendance_records ar
JOIN buscontrol.bus_trips bt ON bt.id = ar.trip_id
LEFT JOIN public.social_bus_escolar s ON s.id = ar.student_id
LEFT JOIN buscontrol.app_profiles op ON op.id = ar.operator_id
WHERE ar.is_offline_sync = true
  AND ar.voided_at IS NULL
ORDER BY ar.scanned_at DESC;

COMMENT ON VIEW buscontrol.v_offline_sync_pending IS
  'Registros marcados como sincronizados desde modo offline; útil para auditar retrasos.';

-- Función: alerta si hay muchos fallos push en las últimas N horas
CREATE OR REPLACE FUNCTION buscontrol.push_failure_count(
  p_hours integer DEFAULT 24
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT count(*)
  FROM buscontrol.notification_log
  WHERE delivery_status = 'failed'
    AND created_at >= now() - make_interval(hours => p_hours);
$$;

COMMENT ON FUNCTION buscontrol.push_failure_count IS
  'Cuenta fallos push recientes; usar en cron/monitoring (ej. > 10 en 24 h).';

-- Grants lectura para service_role y coordinadores (ajustar según política municipal)
GRANT SELECT ON buscontrol.v_push_delivery_daily TO service_role;
GRANT SELECT ON buscontrol.v_push_delivery_failures TO service_role;
GRANT SELECT ON buscontrol.v_offline_sync_pending TO service_role;
GRANT EXECUTE ON FUNCTION buscontrol.push_failure_count(integer) TO service_role;
