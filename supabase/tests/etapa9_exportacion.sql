-- Ejecutar en Supabase local después de etapa1_roles.sql y de la migración 045.
BEGIN;

CREATE FUNCTION pg_temp.comprobar(condicion boolean, caso text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicion IS DISTINCT FROM true THEN RAISE EXCEPTION 'FALLÓ: %', caso; END IF;
END;
$$;

CREATE FUNCTION pg_temp.rechazado(consulta text, estado text) RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE consulta;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE = estado;
END;
$$;

INSERT INTO buscontrol.bus_units (id, code, label, is_active)
VALUES ('45000000-0000-0000-0300-000000000001', 'SQL-045', 'Bus inactivo de prueba', false);
INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status, started_at)
SELECT ('45000000-0000-0000-0301-' || lpad(n::text, 12, '0'))::uuid,
       CASE WHEN n = 10001 THEN '2034-05-02'::date ELSE '2034-05-01'::date END,
       '45000000-0000-0000-0300-000000000001', 'mañana', 'recojo', 'completed', '2034-05-01T19:00:00Z'
FROM generate_series(1, 10001) n;

ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
INSERT INTO buscontrol.bus_attendance_records (id, trip_id, student_id, event_type, scanned_at, scanned_by, voided_at, void_reason)
VALUES
  ('45000000-0000-0000-0302-000000000001', '45000000-0000-0000-0301-000000000001', 'a0000000-0000-0000-0000-000000000001', 'manual', '2034-05-02T05:05:00Z', 'b0000000-0000-0000-0000-000000000002', NULL, NULL),
  ('45000000-0000-0000-0302-000000000002', '45000000-0000-0000-0301-000000000001', 'a0000000-0000-0000-0000-000000000001', 'subio', '2034-05-02T05:05:00Z', NULL, '2034-05-02T06:00:00Z', 'Duplicado'),
  ('45000000-0000-0000-0302-000000000003', '45000000-0000-0000-0301-000000000001', 'a0000000-0000-0000-0000-000000000002', 'ausente', NULL, NULL, NULL, NULL),
  ('45000000-0000-0000-0302-000000000004', '45000000-0000-0000-0301-000000000002', 'a0000000-0000-0000-0000-000000000001', 'bajo', NULL, NULL, '2034-05-02T06:00:00Z', repeat('á', 1100000));
SET LOCAL TIME ZONE 'UTC';

SET LOCAL ROLE anon;
SELECT pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_prepare_export('viajes')$q$, '42501'), 'anónimo');
RESET ROLE;

DO $$
DECLARE
  i integer;
  llamada constant text := $q$SELECT buscontrol.admin_prepare_export('viajes')$q$;
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', 'b0000000-0000-0000-0000-00000000000' || i,
      'role', 'authenticated', 'aal', CASE WHEN i = 1 THEN 'aal1' ELSE 'aal2' END)::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM pg_temp.comprobar(pg_temp.rechazado(llamada, '42501'), 'perfil sin acceso ' || i);
    RESET ROLE;
  END LOOP;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE buscontrol.app_profiles SET is_active = false WHERE id = 'b0000000-0000-0000-0000-000000000001';
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.comprobar(pg_temp.rechazado(llamada, '42501'), 'administrador inactivo');
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE buscontrol.app_profiles SET is_active = true WHERE id = 'b0000000-0000-0000-0000-000000000001';
  PERFORM set_config('request.jwt.claim.role', '', true);
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}';

DO $$
DECLARE
  bus constant uuid := '45000000-0000-0000-0300-000000000001';
  viaje constant uuid := '45000000-0000-0000-0301-000000000001';
  alumno constant uuid := 'a0000000-0000-0000-0000-000000000001';
  datos jsonb;
  listado jsonb;
BEGIN
  PERFORM pg_temp.comprobar(pg_temp.rechazado('SELECT * FROM buscontrol._admin_trip_rows(NULL,NULL,NULL,NULL,NULL,NULL)', '42501'), 'consulta privada');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_prepare_export('viajes', p_evento=>'subio')$q$, '22023'), 'filtro de otro ámbito');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_prepare_export('viajes', p_desde=>'2034-05-02',p_hasta=>'2034-05-01')$q$, '22023'), 'rango invertido');

  datos := buscontrol.admin_prepare_export('viajes', NULL, '2034-05-01', '2034-05-01', bus, 'mañana', 'recojo', 'completed');
  PERFORM pg_temp.comprobar(datos->>'estado' = 'ok' AND jsonb_array_length(datos->'filas') = 10000, 'límite exacto, filtros y bus inactivo');
  listado := buscontrol.admin_list_trips('2034-05-01', '2034-05-01', bus, 'mañana', 'recojo', 'completed');
  PERFORM pg_temp.comprobar(datos->'filas'->0 @> ((listado->'filas'->0) - 'id') AND (listado->>'total')::int = 10000, 'coincide con consulta en pantalla');
  PERFORM pg_temp.comprobar(buscontrol.admin_prepare_export('viajes', NULL, '2034-05-01', '2034-05-02', bus)->>'estado' = 'limite', '10.001 filas');
  PERFORM pg_temp.comprobar(buscontrol.admin_prepare_export('viajes', NULL, '2034-04-30', '2034-04-30', bus)->>'estado' = 'vacio', 'cero filas');

  datos := buscontrol.admin_prepare_export('viaje', viaje);
  PERFORM pg_temp.comprobar(jsonb_array_length(datos->'filas') = 3
    AND datos->'filas'->0 @> '{"operator_name":"Chofer Prueba","event_type":"manual"}'
    AND datos->'filas'->1 @> '{"anulado":true,"void_reason":"Duplicado","event_type":"subio"}'
    AND datos->'filas'->2 @> '{"scanned_at":null,"event_type":"ausente"}', 'viaje aislado, desempate, nulo al final y anulación');
  PERFORM pg_temp.comprobar(NOT (datos->'filas'->0 ?| ARRAY['id','student_id','operator_id','dni_alumno','lat','lng']), 'proyección sin datos extra');
  PERFORM pg_temp.comprobar(buscontrol.admin_prepare_export('viaje', '45000000-0000-0000-0301-000000000002')->>'estado' = 'tamano', 'tamaño acotado');

  datos := buscontrol.admin_prepare_export('alumno', alumno, '2034-05-01', '2034-05-01', p_turno=>'mañana', p_evento=>'subio');
  PERFORM pg_temp.comprobar(jsonb_array_length(datos->'filas') = 2
    AND datos->'filas'->0 @> '{"trip_date":"2034-05-01","scanned_at":"2034-05-02T05:05:00+00:00","event_type":"manual"}', 'alumno y subidas inclusivas');
  datos := buscontrol.admin_prepare_export('alumno', alumno, '2034-05-01', '2034-05-01', p_evento=>'manual');
  PERFORM pg_temp.comprobar(jsonb_array_length(datos->'filas') = 1 AND datos->'filas'->0->>'event_type' = 'manual', 'manuales solamente');
END;
$$;

RESET ROLE;
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM buscontrol.admin_audit_log
   WHERE action = 'csv_export' AND actor_id = 'b0000000-0000-0000-0000-000000000001'
     AND created_at = transaction_timestamp()) = 4,
  'una auditoría por exportación preparada, sin auditoría en errores'
);
SELECT pg_temp.comprobar(
  EXISTS (SELECT 1 FROM buscontrol.admin_audit_log
   WHERE action = 'csv_export' AND entity_id = 'a0000000-0000-0000-0000-000000000001'
     AND created_at = transaction_timestamp() AND details = '{"origen":"alumno","count":1,"filtros":{"desde":"2034-05-01","hasta":"2034-05-01","evento":"manual"}}'),
  'auditoría con contexto y filtros permitidos'
);
ROLLBACK;
\echo Exportación SQL OK
