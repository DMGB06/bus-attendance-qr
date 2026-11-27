-- Ejecutar en local después de etapa1_roles.sql y de la migración 043.
BEGIN;

CREATE FUNCTION pg_temp.comprobar(condicion boolean, caso text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicion IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FALLÓ: %', caso;
  END IF;
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
VALUES ('43000000-0000-0000-0000-000000000001', 'Alumno SQL Asistencia', '10000430');

INSERT INTO buscontrol.bus_beneficiaries (student_id, is_active, enrolled_by, deactivated_by, deactivated_at, deactivated_reason)
VALUES ('43000000-0000-0000-0000-000000000001', false, 'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', now(), 'Baja de prueba');

INSERT INTO buscontrol.bus_units (id, code, label, is_active)
VALUES ('43000000-0000-0000-0000-000000000002', 'SQL-043', 'Bus SQL Asistencia', false);

INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status)
SELECT ('43000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, '2030-05-01',
       '43000000-0000-0000-0000-000000000002', 'tarde_primaria', 'retorno', 'completed'
FROM generate_series(1, 21) n;

INSERT INTO buscontrol.bus_trips (id, trip_date, turn_type, direction, status)
VALUES
  ('43000000-0000-0000-0002-000000000001', '2030-05-02', 'mañana', 'recojo', 'completed'),
  ('43000000-0000-0000-0002-000000000002', '2030-05-02', 'tarde_primaria', 'retorno', 'completed'),
  ('43000000-0000-0000-0002-000000000003', '2030-04-30', NULL, 'recojo', 'completed'),
  ('43000000-0000-0000-0002-000000000004', '2030-05-03', NULL, 'recojo', 'completed');

ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
INSERT INTO buscontrol.bus_attendance_records (id, trip_id, student_id, event_type, scanned_at)
SELECT ('43000000-0000-0000-0003-' || lpad(n::text, 12, '0'))::uuid, t.id,
       '43000000-0000-0000-0000-000000000001', 'manual', '2030-05-02T05:03:00Z'
FROM generate_series(1, 21) n
JOIN buscontrol.bus_trips t ON t.id = ('43000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid;

INSERT INTO buscontrol.bus_attendance_records (id, trip_id, student_id, event_type, scanned_at, voided_at, void_reason)
SELECT id::uuid, viaje::uuid, alumno::uuid, evento, hora::timestamptz, anulado::timestamptz, motivo
FROM (VALUES
  ('43000000-0000-0000-0003-000000000022', '43000000-0000-0000-0001-000000000001', '43000000-0000-0000-0000-000000000001', 'subio', '2030-05-01T18:00Z', NULL, NULL),
  ('43000000-0000-0000-0003-000000000023', '43000000-0000-0000-0002-000000000001', '43000000-0000-0000-0000-000000000001', 'ausente', '2030-05-02T14:00Z', NULL, NULL),
  ('43000000-0000-0000-0003-000000000024', '43000000-0000-0000-0002-000000000001', '43000000-0000-0000-0000-000000000001', 'bajo', NULL, NULL, NULL),
  ('43000000-0000-0000-0003-000000000025', '43000000-0000-0000-0002-000000000002', '43000000-0000-0000-0000-000000000001', 'subio', '2030-05-02T14:30Z', '2030-05-02T15:00Z', 'QR duplicado'),
  ('43000000-0000-0000-0003-000000000026', '43000000-0000-0000-0002-000000000002', '43000000-0000-0000-0000-000000000001', 'ausente', '2030-05-02T15:30Z', '2030-05-02T16:00Z', 'Ausencia anulada'),
  ('43000000-0000-0000-0003-000000000027', '43000000-0000-0000-0002-000000000003', '43000000-0000-0000-0000-000000000001', 'manual', '2030-05-01T05:05Z', NULL, NULL),
  ('43000000-0000-0000-0003-000000000028', '43000000-0000-0000-0002-000000000004', '43000000-0000-0000-0000-000000000001', 'manual', '2030-05-03T14:00Z', NULL, NULL),
  ('43000000-0000-0000-0003-000000000029', '43000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000002', 'ausente', '2030-05-01T20:00Z', NULL, NULL)
) AS eventos(id, viaje, alumno, evento, hora, anulado, motivo);

SET LOCAL ROLE anon;
SELECT pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_student_attendance(NULL)', '42501'), 'anon');
RESET ROLE;

DO $$
DECLARE
  i integer;
  consulta constant text := $q$SELECT buscontrol.admin_student_attendance('43000000-0000-0000-0000-000000000001')$q$;
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', 'b0000000-0000-0000-0000-00000000000' || i,
      'role', 'authenticated', 'aal', CASE WHEN i = 1 THEN 'aal1' ELSE 'aal2' END)::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM pg_temp.comprobar(pg_temp.rechazado(consulta, '42501'), 'perfil sin acceso ' || i);
    RESET ROLE;
  END LOOP;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE buscontrol.app_profiles SET is_active = false WHERE id = 'b0000000-0000-0000-0000-000000000001';
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.comprobar(pg_temp.rechazado(consulta, '42501'), 'administrador inactivo con MFA');
  RESET ROLE;
  -- El ROLLBACK de la suite restaura el estado original.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE buscontrol.app_profiles SET is_active = true WHERE id = 'b0000000-0000-0000-0000-000000000001';
  PERFORM set_config('request.jwt.claim.role', '', true);
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}';
SET LOCAL TIME ZONE 'UTC';

DO $$
DECLARE
  alumno constant uuid := '43000000-0000-0000-0000-000000000001';
  datos jsonb;
BEGIN
  datos := buscontrol.admin_student_attendance(alumno, '2030-05-01', '2030-05-02');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 26 AND jsonb_array_length(datos->'filas') = 20, 'fechas inclusivas y primera página');
  PERFORM pg_temp.comprobar(datos->'resumen' = '{"subidas":21,"ausencias":1}', 'alumno de baja, viajes únicos y exclusión de anulados');
  PERFORM pg_temp.comprobar(datos->'filas'->0->>'id' = '43000000-0000-0000-0003-000000000026'
    AND datos->'filas'->3->>'id' = '43000000-0000-0000-0003-000000000024'
    AND datos->'filas'->4->>'id' = '43000000-0000-0000-0003-000000000001', 'orden por fecha, hora, nulos e identificador');
  PERFORM pg_temp.comprobar(datos->'filas' @> '[{"void_reason":"QR duplicado","bus_code":null}]', 'motivo de anulación y viaje sin bus');

  datos := buscontrol.admin_student_attendance(alumno, '2030-05-01', '2030-05-01', 'tarde_primaria', 'subio');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 22 AND datos->'resumen' = '{"subidas":21,"ausencias":0}', 'subidas QR y manuales en fechas y turno');
  PERFORM pg_temp.comprobar(datos->'filas'->0 @> '{"trip_date":"2030-05-01","scanned_at":"2030-05-02T05:03:00+00:00","bus_code":"SQL-043"}', 'evento después de medianoche pertenece al día del viaje');
  datos := buscontrol.admin_student_attendance(alumno, '2030-05-01', '2030-05-01', 'tarde_primaria', 'subio', 20, 20);
  PERFORM pg_temp.comprobar(jsonb_array_length(datos->'filas') = 2 AND datos->'filas'->1->>'event_type' = 'subio', 'segunda página y QR incluido');
  datos := buscontrol.admin_student_attendance(alumno, '2030-05-01', '2030-05-02', 'tarde_primaria', 'manual', 20, 40);
  PERFORM pg_temp.comprobar(datos->'filas' = '[]' AND (datos->>'total')::int = 21, 'solo manuales y total fuera de rango');
  datos := buscontrol.admin_student_attendance(alumno, '2030-05-01', '2030-05-02', 'mañana', 'subio');
  PERFORM pg_temp.comprobar(datos->'filas' = '[]' AND (datos->>'total')::int = 0
    AND datos->'resumen' = '{"subidas":0,"ausencias":1}', 'el tipo de evento no filtra el resumen');
  datos := buscontrol.admin_student_attendance(alumno, NULL, '2030-04-30');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 1, 'rango abierto con hora posterior al viaje');
  datos := buscontrol.admin_student_attendance('43000000-0000-0000-0000-000000000099');
  PERFORM pg_temp.comprobar(datos = '{"filas":[],"total":0,"resumen":{"subidas":0,"ausencias":0}}', 'sin historial');
  PERFORM pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_student_attendance(NULL)', '22023'), 'UUID obligatorio');
  PERFORM pg_temp.comprobar(pg_temp.rechazado(format('SELECT buscontrol.admin_student_attendance(%L,p_limit=>21)', alumno), '22023'), 'límite inválido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado(format('SELECT buscontrol.admin_student_attendance(%L,p_offset=>-1)', alumno), '22023'), 'offset inválido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado(format('SELECT buscontrol.admin_student_attendance(%L,%L,%L)', alumno, '2030-05-02','2030-05-01'), '22023'), 'rango invertido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado(format('SELECT buscontrol.admin_student_attendance(%L,p_evento=>%L)', alumno, 'otro'), '22023'), 'evento inválido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado(format('SELECT buscontrol.admin_student_attendance(%L,p_turno=>%L)', alumno, 'otro'), '22023'), 'turno inválido');
END;
$$;

RESET ROLE;
ROLLBACK;
\echo Asistencia SQL OK
