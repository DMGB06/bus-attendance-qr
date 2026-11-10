-- Pruebas 028 (beneficiarios, PASS/FALLA). Requiere etapa1_roles.sql (usuarios y alumnos) y aplicadas 026 y 028.
CREATE TEMP TABLE res (n serial, suite text, label text, esp text, obt text, ok boolean);

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uid text, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text; n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"'||p_role||'"}'
         ELSE '{"sub":"'||p_uid||'","role":"'||p_role||'"}' END, true);
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
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"'||p_role||'"}'
         ELSE '{"sub":"'||p_uid||'","role":"'||p_role||'"}' END, true);
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

\set ADM 'b0000000-0000-0000-0000-000000000001'
\set S1 'a0000000-0000-0000-0000-000000000001'
\set S2 'a0000000-0000-0000-0000-000000000002'

DELETE FROM buscontrol.bus_beneficiaries;
DELETE FROM buscontrol.admin_audit_log WHERE entity = 'bus_beneficiaries';

-- ADMIN: ciclo alta / baja / reactivar
SELECT pg_temp.chk('etapa2_beneficiarios','alta S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.enroll_beneficiary('a0000000-0000-0000-0000-000000000001')$$), 'OK');
SELECT pg_temp.chk('etapa2_beneficiarios','alta S1 otra vez (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.enroll_beneficiary('a0000000-0000-0000-0000-000000000001')$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','baja sin motivo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000001','  ')$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','baja S1 con motivo', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000001','se mudo')$$), 'OK');
SELECT pg_temp.chk('etapa2_beneficiarios','estado tras baja: inactivo con motivo', (SELECT is_active::text||';'||coalesce(deactivated_reason,'null') FROM buscontrol.bus_beneficiaries WHERE student_id=:'S1'), 'false;se mudo');
SELECT pg_temp.chk('etapa2_beneficiarios','baja otra vez (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000001','x')$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','reactivar S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.enroll_beneficiary('a0000000-0000-0000-0000-000000000001')$$), 'OK');
SELECT pg_temp.chk('etapa2_beneficiarios','estado tras reactivar: activo y sin datos de baja', (SELECT is_active::text||';'||coalesce(deactivated_reason,'null')||';'||coalesce(deactivated_at::text,'null') FROM buscontrol.bus_beneficiaries WHERE student_id=:'S1'), 'true;null;null');
SELECT pg_temp.chk('etapa2_beneficiarios','baja de quien no es beneficiario (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000002','x')$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','alta alumno inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.enroll_beneficiary(gen_random_uuid())$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','admin lee bus_beneficiaries', pg_temp.cnt(:'ADM','authenticated','buscontrol.bus_beneficiaries'), '1');
SELECT pg_temp.chk('etapa2_beneficiarios','admin INSERT directo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$INSERT INTO buscontrol.bus_beneficiaries(student_id,enrolled_by) VALUES ('a0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001')$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','admin UPDATE directo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$UPDATE buscontrol.bus_beneficiaries SET is_active=false$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','admin DELETE directo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$DELETE FROM buscontrol.bus_beneficiaries$$), 'ERR');

-- CONSTRAINT: estado incoherente se rechaza (como postgres)
DO $o$
DECLARE v text := 'OK';
BEGIN
  BEGIN
    UPDATE buscontrol.bus_beneficiaries SET is_active=false WHERE student_id='a0000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN check_violation THEN
    v := 'ERR';
  END;
  PERFORM pg_temp.chk('etapa2_beneficiarios','constraint: inactivo sin datos de baja (bloqueado)', v, 'ERR');
END $o$;

-- OTROS ROLES
DO $o$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('chofer','b0000000-0000-0000-0000-000000000002'),('asistenta','b0000000-0000-0000-0000-000000000003'),
                                  ('padre','b0000000-0000-0000-0000-000000000004'),('coordinador','b0000000-0000-0000-0000-000000000005')) v(n,id)
  LOOP
    PERFORM pg_temp.chk('etapa2_beneficiarios', 'rol '||r.n||': dar de alta', pg_temp.as_user(r.id,'authenticated',$s$SELECT buscontrol.enroll_beneficiary('a0000000-0000-0000-0000-000000000002')$s$), 'ERR');
    PERFORM pg_temp.chk('etapa2_beneficiarios', 'rol '||r.n||': dar de baja', pg_temp.as_user(r.id,'authenticated',$s$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000001','x')$s$), 'ERR');
    PERFORM pg_temp.chk('etapa2_beneficiarios', 'rol '||r.n||': lee bus_beneficiaries', pg_temp.cnt(r.id,'authenticated','buscontrol.bus_beneficiaries'), 'ERR|0');
  END LOOP;
END $o$;

-- ANON
SELECT pg_temp.chk('etapa2_beneficiarios','anon lee bus_beneficiaries', pg_temp.cnt(NULL,'anon','buscontrol.bus_beneficiaries'), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','anon dar de alta', pg_temp.as_user(NULL,'anon',$$SELECT buscontrol.enroll_beneficiary('a0000000-0000-0000-0000-000000000002')$$), 'ERR');
SELECT pg_temp.chk('etapa2_beneficiarios','anon dar de baja', pg_temp.as_user(NULL,'anon',$$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000001','x')$$), 'ERR');

-- BAJA NO CIERRA CARNET
SELECT pg_temp.chk('etapa2_beneficiarios','carnet: admin emite carnet a S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000001','prueba baja')$$), 'OK');
SELECT pg_temp.chk('etapa2_beneficiarios','carnet: admin da de baja a S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.deactivate_beneficiary('a0000000-0000-0000-0000-000000000001','prueba')$$), 'OK');
SELECT pg_temp.chk('etapa2_beneficiarios','carnet vigente sigue vigente tras la baja', (SELECT count(*)::text FROM buscontrol.qr_codes WHERE student_id=:'S1' AND status='vigente'), '1');

-- AUDITORIA
SELECT pg_temp.chk('etapa2_beneficiarios','auditoria beneficiary_deactivate', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE entity='bus_beneficiaries' AND action='beneficiary_deactivate'), '2');
SELECT pg_temp.chk('etapa2_beneficiarios','auditoria beneficiary_enroll', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE entity='bus_beneficiaries' AND action='beneficiary_enroll'), '1');
SELECT pg_temp.chk('etapa2_beneficiarios','auditoria beneficiary_reactivate', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE entity='bus_beneficiaries' AND action='beneficiary_reactivate'), '1');

\echo === RESUMEN etapa2_beneficiarios ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
