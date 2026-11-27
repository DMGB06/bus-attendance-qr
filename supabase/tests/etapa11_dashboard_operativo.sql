-- Ejecutar en Supabase local después de etapa1_roles.sql y de la migración 048.
BEGIN;

CREATE FUNCTION pg_temp.comprobar(condicion boolean, caso text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicion IS DISTINCT FROM true THEN RAISE EXCEPTION 'FALLÓ: %', caso; END IF;
END;
$$;

CREATE FUNCTION pg_temp.rechazado() RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM buscontrol.admin_dashboard_operativo();
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END;
$$;

SET LOCAL ROLE anon;
SELECT pg_temp.comprobar(pg_temp.rechazado(), 'anónimo');
RESET ROLE;

DO $$
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', 'b0000000-0000-0000-0000-00000000000' || i,
      'role', 'authenticated', 'aal', CASE WHEN i = 1 THEN 'aal1' ELSE 'aal2' END)::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM pg_temp.comprobar(pg_temp.rechazado(), 'perfil sin acceso ' || i);
    RESET ROLE;
  END LOOP;
END;
$$;

SET LOCAL request.jwt.claim.role = 'service_role';
UPDATE buscontrol.app_profiles SET is_active = false WHERE id = 'b0000000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claim.role = '';
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}';
SET LOCAL ROLE authenticated;
SELECT pg_temp.comprobar(pg_temp.rechazado(), 'administrador inactivo');
RESET ROLE;
SET LOCAL request.jwt.claim.role = 'service_role';
UPDATE buscontrol.app_profiles SET is_active = true WHERE id = 'b0000000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claim.role = '';

-- En la instancia de pruebas, apartar los viajes de la ventana dentro de la transacción.
-- El rollback restaura sus fechas y todas las demás filas.
UPDATE buscontrol.bus_trips SET trip_date = trip_date - 120
WHERE trip_date BETWEEN (now() AT TIME ZONE 'America/Lima')::date - 6 AND (now() AT TIME ZONE 'America/Lima')::date;

SET LOCAL ROLE authenticated;
SELECT pg_temp.comprobar(
  (buscontrol.admin_dashboard_operativo() - 'fecha' - 'dias') =
    '{"en_curso":0,"cerrados":0,"subidas":0,"ausencias":0,"anulaciones":0}',
  'semana vacía');
RESET ROLE;

INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno)
VALUES ('48000000-0000-0000-0300-000000000001', 'Alumno SQL Dashboard', '10000480');
INSERT INTO buscontrol.bus_beneficiaries (student_id, is_active, enrolled_by, deactivated_at, deactivated_by, deactivated_reason)
VALUES ('48000000-0000-0000-0300-000000000001', false, 'b0000000-0000-0000-0000-000000000001', now(),
        'b0000000-0000-0000-0000-000000000001', 'Baja de prueba');
INSERT INTO buscontrol.bus_units (id, code, label, is_active)
VALUES ('48000000-0000-0000-0300-000000000002', 'SQL-048', 'Bus inactivo de prueba', false);

INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status)
SELECT ('48000000-0000-0000-0301-' || lpad(n::text, 12, '0'))::uuid,
       (now() AT TIME ZONE 'America/Lima')::date + desplazamiento,
       '48000000-0000-0000-0300-000000000002', 'mañana', 'recojo', estado
FROM (VALUES (1, 0, 'active'), (2, 0, 'completed'), (3, -6, 'completed'), (4, -7, 'completed'), (5, 1, 'completed')) v(n, desplazamiento, estado);

ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, voided_at, void_reason)
SELECT t.id, '48000000-0000-0000-0300-000000000001', e.tipo,
       (t.trip_date + interval '1 day 1 hour') AT TIME ZONE 'America/Lima',
       CASE WHEN e.anulado THEN (t.trip_date + interval '1 day 2 hours') AT TIME ZONE 'America/Lima' END,
       CASE WHEN e.anulado THEN 'Anulación de prueba' END
FROM (VALUES (1, 'subio', false), (1, 'manual', false), (1, 'bajo', false), (1, 'ausente', true),
             (2, 'manual', false), (2, 'subio', true), (2, 'ausente', false),
             (3, 'subio', false), (4, 'ausente', false), (5, 'ausente', true)) e(n, tipo, anulado)
JOIN buscontrol.bus_trips t ON t.id = ('48000000-0000-0000-0301-' || lpad(e.n::text,12,'0'))::uuid;
ALTER TABLE buscontrol.bus_attendance_records ENABLE TRIGGER "attendance-push";

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  hoy constant date := (now() AT TIME ZONE 'America/Lima')::date;
  resultado jsonb;
  serie jsonb;
BEGIN
  SET LOCAL TIME ZONE 'UTC';
  resultado := buscontrol.admin_dashboard_operativo();
  SET LOCAL TIME ZONE 'Pacific/Kiritimati';
  PERFORM pg_temp.comprobar(resultado = buscontrol.admin_dashboard_operativo(), 'zona de sesión independiente');
  SET LOCAL TIME ZONE 'Pacific/Honolulu';
  PERFORM pg_temp.comprobar(resultado = buscontrol.admin_dashboard_operativo(), 'el mismo corte bajo otra zona');

  SELECT jsonb_agg(jsonb_build_object('fecha', to_char(hoy - i, 'YYYY-MM-DD'),
    'en_curso', CASE WHEN i = 0 THEN 1 ELSE 0 END,
    'cerrados', CASE WHEN i IN (0,6) THEN 1 ELSE 0 END) ORDER BY i DESC)
  INTO serie FROM generate_series(0,6) AS g(i);

  PERFORM pg_temp.comprobar(resultado = jsonb_build_object('fecha', to_char(hoy, 'YYYY-MM-DD'),
    'en_curso', 1, 'cerrados', 1, 'subidas', 2, 'ausencias', 1, 'anulaciones', 2, 'dias', serie),
    'agregados sin PII, siete días inclusivos, eventos únicos y fecha original');
  PERFORM pg_temp.comprobar((buscontrol.admin_list_trips(hoy, hoy, p_estado=>'active')->>'total')::int = 1,
    'equivalencia Viajes en curso');
  PERFORM pg_temp.comprobar((buscontrol.admin_list_trips(hoy, hoy, p_estado=>'completed')->>'total')::int = 1,
    'equivalencia Viajes cerrados');
  PERFORM pg_temp.comprobar((buscontrol.admin_list_trips(hoy - 6, hoy)->>'total')::int = 3, 'equivalencia Viajes semana');
  PERFORM pg_temp.comprobar(NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(resultado->'dias') AS dia
    WHERE (buscontrol.admin_list_trips((dia->>'fecha')::date, (dia->>'fecha')::date)->>'total')::int
      <> (dia->>'en_curso')::int + (dia->>'cerrados')::int
  ), 'equivalencia por día con el listado de Viajes');
  PERFORM pg_temp.comprobar((resultado->>'subidas')::int = (
    SELECT sum((buscontrol.admin_trip_detail(id)->'resumen'->>'subidas')::int)
    FROM unnest(ARRAY['48000000-0000-0000-0301-000000000001','48000000-0000-0000-0301-000000000002']::uuid[]) t(id)
  ), 'equivalencia con el detalle de cada viaje');
  PERFORM pg_temp.comprobar((buscontrol.admin_student_attendance('48000000-0000-0000-0300-000000000001',
    hoy, hoy)->'resumen'->>'subidas')::int = (resultado->>'subidas')::int,
    'equivalencia con Asistencia del alumno de baja');
  PERFORM pg_temp.comprobar((buscontrol.admin_list_incidents(hoy, hoy)->>'total')::int = 3, 'equivalencia Incidencias');
  PERFORM pg_temp.comprobar((buscontrol.admin_list_incidents(hoy, hoy, p_tipo=>'ausencia')->>'total')::int = 1, 'equivalencia Ausencias');
  PERFORM pg_temp.comprobar((buscontrol.admin_list_incidents(hoy, hoy, p_tipo=>'anulacion')->>'total')::int = 2, 'equivalencia Anulaciones');
END;
$$;

RESET ROLE;
ROLLBACK;
\echo Dashboard operativo SQL OK
