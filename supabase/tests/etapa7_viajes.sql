-- Ejecutar sobre Supabase local después de etapa1_roles.sql y de la migración 041.
BEGIN;

CREATE FUNCTION pg_temp.comprobar(condicion boolean, caso text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicion IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FALLÓ: %', caso;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.rechazado(consulta text, estado text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE consulta;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN estado IS NULL OR SQLSTATE = estado;
END;
$$;

INSERT INTO buscontrol.bus_units (id, code, label, is_active)
VALUES ('41000000-0000-0000-0000-000000000001', 'SQL-041', 'Bus SQL Viajes', false);

INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status, started_at)
SELECT ('41000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, '2030-05-01',
       '41000000-0000-0000-0000-000000000001', 'tarde_primaria', 'retorno', 'completed', '2030-05-01 19:00:00+00'
FROM generate_series(1, 21) n;

INSERT INTO buscontrol.bus_trips (id, trip_date, turn_type, direction, status, started_at)
VALUES ('41000000-0000-0000-0002-000000000001', '2030-05-02', NULL, 'recojo', 'active', NULL);

INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno)
VALUES ('41000000-0000-0000-0003-000000000001', 'Alumno ausente SQL Viajes', '10000410');

ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_by, voided_at, void_reason)
SELECT '41000000-0000-0000-0001-000000000001', alumno::uuid, tipo,
       'b0000000-0000-0000-0000-000000000002', anulado::timestamptz, motivo
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000001', 'subio', NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'manual', NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'bajo', '2030-05-01T20:00Z', 'Duplicado'),
  ('a0000000-0000-0000-0000-000000000002', 'subio', NULL, NULL),
  ('a0000000-0000-0000-0000-000000000002', 'bajo', NULL, NULL),
  ('41000000-0000-0000-0003-000000000001', 'ausente', NULL, NULL)
) AS eventos(alumno, tipo, anulado, motivo);

SET LOCAL ROLE anon;
SELECT pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_list_trips()', '42501'), 'anon listado');
SELECT pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_list_trip_buses()', '42501'), 'anon buses');
SELECT pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_trip_detail(NULL)', '42501'), 'anon detalle');
RESET ROLE;

-- Toda combinación de rol móvil con MFA, o administrador sin MFA, queda fuera.
DO $$
DECLARE
  perfil record;
  consulta text;
BEGIN
  FOR perfil IN
    SELECT p.id, p.app_role,
           CASE WHEN p.app_role = 'administrador' THEN 'aal1' ELSE 'aal2' END AS aal
    FROM buscontrol.app_profiles p
    WHERE p.id IN (
      'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
      'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004',
      'b0000000-0000-0000-0000-000000000005'
    )
  LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', perfil.id, 'role', 'authenticated', 'aal', perfil.aal)::text, true);
    SET LOCAL ROLE authenticated;
    FOREACH consulta IN ARRAY ARRAY[
      'SELECT buscontrol.admin_list_trips()', 'SELECT buscontrol.admin_list_trip_buses()',
      'SELECT buscontrol.admin_trip_detail(''41000000-0000-0000-0001-000000000001'')'
    ]
    LOOP
      PERFORM pg_temp.comprobar(pg_temp.rechazado(consulta), perfil.app_role::text || ' ' || consulta);
    END LOOP;
    RESET ROLE;
  END LOOP;
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}';

DO $$
DECLARE
  bus constant uuid := '41000000-0000-0000-0000-000000000001';
  viaje constant uuid := '41000000-0000-0000-0001-000000000001';
  vacio constant uuid := '41000000-0000-0000-0002-000000000001';
  datos jsonb;
BEGIN
  datos := buscontrol.admin_list_trips('2030-05-01', '2030-05-01', bus, 'tarde_primaria', 'retorno', 'completed');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 21 AND jsonb_array_length(datos->'filas') = 20, 'filtros y fechas inclusivas');
  PERFORM pg_temp.comprobar(datos->'filas'->0->>'id' = viaje::text, 'desempate por identificador');
  datos := buscontrol.admin_list_trips('2030-05-01', '2030-05-01', bus, NULL, NULL, NULL, 20, 20);
  PERFORM pg_temp.comprobar(jsonb_array_length(datos->'filas') = 1 AND (datos->>'total')::int = 21, 'página dos');
  datos := buscontrol.admin_list_trips(NULL, NULL, bus, NULL, NULL, NULL, 20, 40);
  PERFORM pg_temp.comprobar(datos->'filas' = '[]' AND (datos->>'total')::int = 21, 'total fuera de rango');
  PERFORM pg_temp.comprobar((SELECT count(*) = 1 FROM buscontrol.admin_list_trip_buses() b WHERE b.id = bus), 'bus inactivo con historial');

  datos := buscontrol.admin_trip_detail(viaje);
  PERFORM pg_temp.comprobar(datos->'resumen' = '{"subidas":2,"bajadas":1,"ausencias":1,"pendientes":1}', 'totales por alumno sin anulados');
  PERFORM pg_temp.comprobar((datos->>'total')::int = 6 AND datos->'filas' @> '[{"void_reason":"Duplicado"}]', 'historial conserva anulados');
  PERFORM pg_temp.comprobar(datos->'filas'->0->>'operator_name' IS NOT NULL, 'nombre de operador');
  datos := buscontrol.admin_trip_detail(viaje, 1, 40);
  PERFORM pg_temp.comprobar(datos->'filas' = '[]' AND (datos->>'total')::int = 6 AND datos->'resumen'->>'subidas' = '2', 'totales independientes de página');
  datos := buscontrol.admin_trip_detail(vacio);
  PERFORM pg_temp.comprobar(datos->'filas' = '[]' AND (datos->>'total')::int = 0 AND datos->'viaje'->>'id' = vacio::text, 'viaje sin eventos');
  PERFORM pg_temp.comprobar(buscontrol.admin_trip_detail('41000000-0000-0000-0000-000000000099') IS NULL, 'viaje inexistente');
  PERFORM pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_trip_detail(NULL)', '22023'), 'UUID obligatorio');
  PERFORM pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_list_trips(p_limit => 21)', '22023'), 'límite inválido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado('SELECT buscontrol.admin_list_trips(p_offset => -1)', '22023'), 'offset inválido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_list_trips('2030-05-02','2030-05-01')$q$, '22023'), 'rango invertido');
  PERFORM pg_temp.comprobar(pg_temp.rechazado($q$SELECT buscontrol.admin_list_trips(p_turno => 'otro')$q$, '22023'), 'turno inválido');
END;
$$;

RESET ROLE;
ROLLBACK;
\echo Viajes SQL OK
