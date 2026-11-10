-- Pruebas extra Etapa 1 (PASS/FALLA). Requiere haber corrido etapa1_roles.sql antes (usuarios y alumnos).
CREATE TEMP TABLE res (n serial, suite text, label text, esp text, obt text, ok boolean);

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uid text, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text; n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"'||p_uid||'","role":"'||p_role||'"}', true);
  EXECUTE 'SET LOCAL ROLE ' || p_role;
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    r := 'OK rows=' || n;
  EXCEPTION WHEN OTHERS THEN
    r := 'ERR: ' || SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.cnt(p_uid text, p_role text, p_tbl text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"'||p_uid||'","role":"'||p_role||'"}', true);
  EXECUTE 'SET LOCAL ROLE ' || p_role;
  BEGIN
    EXECUTE 'SELECT count(*)::text FROM ' || p_tbl INTO r;
  EXCEPTION WHEN OTHERS THEN
    r := 'ERR: ' || SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.chk(p_suite text, p_label text, p_obt text, p_esp text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE a text; ok boolean := false;
BEGIN
  FOREACH a IN ARRAY string_to_array(p_esp, '|') LOOP
    IF (a = 'OK' AND p_obt LIKE 'OK%') OR (a = 'ERR' AND p_obt LIKE 'ERR%') OR (a NOT IN ('OK','ERR') AND p_obt = a) THEN
      ok := true;
    END IF;
  END LOOP;
  INSERT INTO res (suite, label, esp, obt, ok) VALUES (p_suite, p_label, p_esp, p_obt, ok);
END $$;

-- ADMIN NO DEBE TENER PERMISOS OPERATIVOS
SELECT pg_temp.chk('etapa1_extra','admin lee bus_trips', pg_temp.cnt('b0000000-0000-0000-0000-000000000001','authenticated','buscontrol.bus_trips'), 'ERR|0');
SELECT pg_temp.chk('etapa1_extra','admin lee bus_attendance_records', pg_temp.cnt('b0000000-0000-0000-0000-000000000001','authenticated','buscontrol.bus_attendance_records'), 'ERR|0');
SELECT pg_temp.chk('etapa1_extra','admin lee bus_units', pg_temp.cnt('b0000000-0000-0000-0000-000000000001','authenticated','buscontrol.bus_units'), 'ERR|0');
SELECT pg_temp.chk('etapa1_extra','admin lee bus_crew_assignments', pg_temp.cnt('b0000000-0000-0000-0000-000000000001','authenticated','buscontrol.bus_crew_assignments'), 'ERR|0');
SELECT pg_temp.chk('etapa1_extra','admin lee app_profiles (solo el propio)', pg_temp.cnt('b0000000-0000-0000-0000-000000000001','authenticated','buscontrol.app_profiles'), '1');

-- ADMIN INACTIVO NO DEBE EMITIR (el trigger de perfiles exige service_role para cambiar is_active)
SELECT set_config('request.jwt.claim.role','service_role',false);
UPDATE buscontrol.app_profiles SET is_active=false WHERE id='b0000000-0000-0000-0000-000000000001';
SELECT pg_temp.chk('etapa1_extra','admin inactivo emite carnet (bloqueado)', pg_temp.as_user('b0000000-0000-0000-0000-000000000001','authenticated',$$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000002')$$), 'ERR');
UPDATE buscontrol.app_profiles SET is_active=true WHERE id='b0000000-0000-0000-0000-000000000001';

-- PERFIL SIN ROL NO DEBE EMITIR
SELECT set_config('request.jwt.claim.role','service_role',false);
UPDATE buscontrol.app_profiles SET app_role=NULL WHERE id='b0000000-0000-0000-0000-000000000005';
SELECT pg_temp.chk('etapa1_extra','perfil sin rol emite carnet (bloqueado)', pg_temp.as_user('b0000000-0000-0000-0000-000000000005','authenticated',$$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000002')$$), 'ERR');
UPDATE buscontrol.app_profiles SET app_role='coordinador' WHERE id='b0000000-0000-0000-0000-000000000005';

\echo === RESUMEN etapa1_extra ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
