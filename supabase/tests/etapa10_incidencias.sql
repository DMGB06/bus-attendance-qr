-- Ejecutar en Supabase local después de etapa1_roles.sql y de la migración 046.
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

INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno)
VALUES ('46000000-0000-0000-0300-000000000001', 'Alumno SQL Incidencias', '10000460');
INSERT INTO buscontrol.bus_beneficiaries (student_id, is_active, enrolled_by, deactivated_at, deactivated_by, deactivated_reason)
VALUES ('46000000-0000-0000-0300-000000000001', false, 'b0000000-0000-0000-0000-000000000001', now(),
        'b0000000-0000-0000-0000-000000000001', 'Baja de prueba');
INSERT INTO buscontrol.bus_units (id, code, label, is_active)
VALUES ('46000000-0000-0000-0300-000000000002', 'SQL-046', 'Bus inactivo de prueba', false);

INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status)
SELECT ('46000000-0000-0000-0301-' || lpad(n::text, 12, '0'))::uuid, '2036-05-01',
       '46000000-0000-0000-0300-000000000002', 'mañana', 'recojo', 'completed'
FROM generate_series(1, 22) n;
INSERT INTO buscontrol.bus_trips (id, trip_date, turn_type, direction, status)
VALUES ('46000000-0000-0000-0301-000000000023', '2036-05-02', 'tarde', 'retorno', 'completed');

ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
INSERT INTO buscontrol.bus_attendance_records (id, trip_id, student_id, event_type, scanned_at, operator_id)
SELECT ('46000000-0000-0000-0302-' || lpad(n::text, 12, '0'))::uuid, t.id,
       '46000000-0000-0000-0300-000000000001', 'ausente', '2036-05-01T16:00:00Z',
       'b0000000-0000-0000-0000-000000000002'
FROM generate_series(1, 21) n
JOIN buscontrol.bus_trips t ON t.id = ('46000000-0000-0000-0301-' || lpad(n::text, 12, '0'))::uuid;

INSERT INTO buscontrol.bus_attendance_records (id, trip_id, student_id, event_type, scanned_at, scanned_by, voided_at, voided_by, void_reason, is_offline_sync)
VALUES
  ('46000000-0000-0000-0302-000000000022', '46000000-0000-0000-0301-000000000022', '46000000-0000-0000-0300-000000000001', 'ausente', '2036-05-01T17:00:00Z',
   'b0000000-0000-0000-0000-000000000002', '2036-05-02T05:02:00Z', 'b0000000-0000-0000-0000-000000000001', 'Asistencia confirmada', false),
  ('46000000-0000-0000-0302-000000000023', '46000000-0000-0000-0301-000000000001', 'a0000000-0000-0000-0000-000000000002', 'ausente', NULL,
   NULL, NULL, NULL, NULL, false),
  ('46000000-0000-0000-0302-000000000024', '46000000-0000-0000-0301-000000000023', '46000000-0000-0000-0300-000000000001', 'manual', NULL,
   NULL, '2036-05-02T15:00:00Z', NULL, '  ', false),
  ('46000000-0000-0000-0302-000000000025', '46000000-0000-0000-0301-000000000001', '46000000-0000-0000-0300-000000000001', 'subio', '2036-05-01T18:00:00Z',
   NULL, NULL, NULL, NULL, true);
SET LOCAL TIME ZONE 'UTC';

SET LOCAL ROLE anon;
SELECT pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_list_incidents()', '42501'), 'anónimo');
RESET ROLE;

DO $$
DECLARE
  i integer;
  llamada constant text := 'SELECT buscontrol.admin_list_incidents()';
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
  bus constant uuid := '46000000-0000-0000-0300-000000000002';
  datos jsonb;
BEGIN
  datos := buscontrol.admin_list_incidents('2036-05-01', '2036-05-02');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 24 AND jsonb_array_length(datos->'filas') = 20, 'fechas inclusivas, total y primera página');
  PERFORM pg_temp.comprobar(datos->'filas'->0 @> '{"tipo":"anulacion","bus_code":null,"void_reason":null,"voided_by_name":null,"event_type":"manual"}',
    'fecha del viaje primero, datos faltantes');
  PERFORM pg_temp.comprobar(datos->'filas'->1 @> '{"tipo":"anulacion","event_type":"ausente","trip_date":"2036-05-01","incident_at":"2036-05-02T05:02:00+00:00","student_name":"Alumno SQL Incidencias","operator_name":"Chofer Prueba","voided_by_name":"Admin Prueba","void_reason":"Asistencia confirmada"}',
    'ausencia anulada de alumno de baja, fecha original y responsable de anulación');
  PERFORM pg_temp.comprobar(NOT (datos->'filas'->1 ?| ARRAY['dni_alumno','scanned_by','lat','lng','voided_by','operator_id']), 'solo campos operativos');

  datos := buscontrol.admin_list_incidents('2036-05-01', '2036-05-01', bus, 'mañana', 'ausencia');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 22 AND datos->'filas'->0 @> '{"id":"46000000-0000-0000-0302-000000000001","tipo":"ausencia","operator_name":"Chofer Prueba","bus_code":"SQL-046"}',
    'bus inactivo, filtros combinados, operador y desempate');
  datos := buscontrol.admin_list_incidents('2036-05-01', '2036-05-01', bus, 'mañana', 'ausencia', 20, 20);
  PERFORM pg_temp.comprobar(jsonb_array_length(datos->'filas') = 2 AND datos->'filas'->1 @> '{"incident_at":null,"operator_name":null}',
    'segunda página y hora nula al final');
  datos := buscontrol.admin_list_incidents('2036-05-01', '2036-05-01', bus, 'mañana', 'anulacion');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 1 AND datos->'filas'->0->>'event_type' = 'ausente', 'la misma ausencia anulada aparece una vez');
  datos := buscontrol.admin_list_incidents('2036-05-01', '2036-05-01', bus, p_offset=>100);
  PERFORM pg_temp.comprobar(datos = '{"total":23,"filas":[]}', 'total fuera de rango');
  PERFORM pg_temp.comprobar(buscontrol.admin_list_incidents('2036-04-01', '2036-04-02') = '{"total":0,"filas":[]}', 'conjunto vacío');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_list_incidents('2036-05-02','2036-05-01')$q$, '22023'), 'rango invertido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_list_incidents(p_hasta=>'infinity')$q$, '22023'), 'fecha no finita');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_list_incidents(p_tipo=>'otro')$q$, '22023'), 'tipo inválido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_list_incidents(p_limit=>21)', '22023'), 'límite inválido');
END;
$$;

RESET ROLE;
ROLLBACK;
\echo Incidencias SQL OK
