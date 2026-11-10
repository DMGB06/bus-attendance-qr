-- Pruebas Etapa 1 (solo BD local de Docker). Cada prueba marca PASS o FALLA.
-- Uso: docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa1_roles.sql
-- Termina con error si hay alguna prueba fallida.

INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES
 ('a0000000-0000-0000-0000-000000000001','ALUMNO PRUEBA UNO','10000001','BU0098'),
 ('a0000000-0000-0000-0000-000000000002','ALUMNO PRUEBA DOS','10000002','BU0099')
ON CONFLICT DO NOTHING;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v.email, '', now(), '{}', '{}', now(), now()
FROM (VALUES
 ('b0000000-0000-0000-0000-000000000001','admin@test.local'),
 ('b0000000-0000-0000-0000-000000000002','chofer@test.local'),
 ('b0000000-0000-0000-0000-000000000003','asistenta@test.local'),
 ('b0000000-0000-0000-0000-000000000004','padre@test.local'),
 ('b0000000-0000-0000-0000-000000000005','coordinador@test.local')
) v(id,email) ON CONFLICT DO NOTHING;

INSERT INTO buscontrol.app_profiles (id, email, full_name, app_role) VALUES
 ('b0000000-0000-0000-0000-000000000001','admin@test.local','Admin Prueba','administrador'),
 ('b0000000-0000-0000-0000-000000000002','chofer@test.local','Chofer Prueba','chofer'),
 ('b0000000-0000-0000-0000-000000000003','asistenta@test.local','Asistenta Prueba','asistenta'),
 ('b0000000-0000-0000-0000-000000000004','padre@test.local','Padre Prueba','padre'),
 ('b0000000-0000-0000-0000-000000000005','coordinador@test.local','Coordinador Prueba','coordinador')
ON CONFLICT (id) DO UPDATE SET app_role = EXCLUDED.app_role;

-- Desde la 033 el movil solo ve a los beneficiarios activos: se dan de alta los 2 alumnos de prueba.
-- (Dinamico para que este script tambien corra antes de aplicar 028.)
DO $b$ BEGIN
  IF to_regclass('buscontrol.bus_beneficiaries') IS NOT NULL THEN
    EXECUTE $q$INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by)
      SELECT id, 'b0000000-0000-0000-0000-000000000001' FROM public.social_bus_escolar
      WHERE id IN ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002')
      ON CONFLICT (student_id) DO UPDATE SET is_active = true, deactivated_at = NULL, deactivated_by = NULL, deactivated_reason = NULL$q$;
  END IF;
END $b$;

-- Estado limpio: otras suites dejan al padre de prueba como apoderado.
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.qr_codes;
DELETE FROM buscontrol.admin_audit_log;

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

-- esp: 'OK' (empieza con OK), 'ERR' (empieza con ERR), valor exacto, o varias opciones separadas por |
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

-- ADMIN
SELECT pg_temp.chk('etapa1_roles','admin emite S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000001','primera')$$), 'OK');
SELECT pg_temp.chk('etapa1_roles','admin reemite S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000001','renovacion')$$), 'OK');
SELECT pg_temp.chk('etapa1_roles','S1 tiene 1 vigente', (SELECT count(*)::text FROM buscontrol.qr_codes WHERE student_id=:'S1' AND status='vigente'), '1');
SELECT pg_temp.chk('etapa1_roles','S1 tiene 1 reemplazado', (SELECT count(*)::text FROM buscontrol.qr_codes WHERE student_id=:'S1' AND status='reemplazado'), '1');
SELECT pg_temp.chk('etapa1_roles','admin reporta perdido S1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.report_qr_lost('a0000000-0000-0000-0000-000000000001','se perdio')$$), 'OK');
SELECT pg_temp.chk('etapa1_roles','reporta de nuevo S1 (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.report_qr_lost('a0000000-0000-0000-0000-000000000001','otra vez')$$), 'ERR');
SELECT pg_temp.chk('etapa1_roles','reporta sin motivo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.report_qr_lost('a0000000-0000-0000-0000-000000000002','')$$), 'ERR');
SELECT pg_temp.chk('etapa1_roles','emite alumno inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.issue_qr_card(gen_random_uuid())$$), 'ERR');
SELECT pg_temp.chk('etapa1_roles','admin lee qr_codes', pg_temp.cnt(:'ADM','authenticated','buscontrol.qr_codes'), '2');
SELECT pg_temp.chk('etapa1_roles','admin lee admin_audit_log', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_audit_log'), '3');
SELECT pg_temp.chk('etapa1_roles','admin lee padron', pg_temp.cnt(:'ADM','authenticated','public.social_bus_escolar'), '2');
SELECT pg_temp.chk('etapa1_roles','admin INSERT directo qr_codes (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$INSERT INTO buscontrol.qr_codes(student_id,code,issued_by) VALUES ('a0000000-0000-0000-0000-000000000002','X','b0000000-0000-0000-0000-000000000001')$$), 'ERR');
SELECT pg_temp.chk('etapa1_roles','admin UPDATE directo qr_codes (sin efecto)', pg_temp.as_user(:'ADM','authenticated',$$UPDATE buscontrol.qr_codes SET status='vigente'$$), 'ERR|OK rows=0');
SELECT pg_temp.chk('etapa1_roles','admin DELETE directo qr_codes (sin efecto)', pg_temp.as_user(:'ADM','authenticated',$$DELETE FROM buscontrol.qr_codes$$), 'ERR|OK rows=0');
SELECT pg_temp.chk('etapa1_roles','admin cambia su propio rol (sin efecto)', pg_temp.as_user(:'ADM','authenticated',$$UPDATE buscontrol.app_profiles SET app_role='chofer' WHERE id='b0000000-0000-0000-0000-000000000001'$$), 'ERR|OK rows=0');
SELECT pg_temp.chk('etapa1_roles','rol del admin sigue siendo administrador', (SELECT app_role::text FROM buscontrol.app_profiles WHERE id='b0000000-0000-0000-0000-000000000001'), 'administrador');

-- OTROS ROLES
DO $o$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('chofer','b0000000-0000-0000-0000-000000000002'),('asistenta','b0000000-0000-0000-0000-000000000003'),
                                  ('padre','b0000000-0000-0000-0000-000000000004'),('coordinador','b0000000-0000-0000-0000-000000000005')) v(n,id)
  LOOP
    PERFORM pg_temp.chk('etapa1_roles', 'rol '||r.n||': emitir carnet', pg_temp.as_user(r.id,'authenticated',$s$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000002')$s$), 'ERR');
    PERFORM pg_temp.chk('etapa1_roles', 'rol '||r.n||': reportar perdido', pg_temp.as_user(r.id,'authenticated',$s$SELECT buscontrol.report_qr_lost('a0000000-0000-0000-0000-000000000001','x')$s$), 'ERR');
    PERFORM pg_temp.chk('etapa1_roles', 'rol '||r.n||': lee qr_codes', pg_temp.cnt(r.id,'authenticated','buscontrol.qr_codes'), 'ERR|0');
    PERFORM pg_temp.chk('etapa1_roles', 'rol '||r.n||': lee admin_audit_log', pg_temp.cnt(r.id,'authenticated','buscontrol.admin_audit_log'), 'ERR|0');
    PERFORM pg_temp.chk('etapa1_roles', 'rol '||r.n||': lee padron (movil)', pg_temp.cnt(r.id,'authenticated','public.social_bus_escolar'),
                        CASE WHEN r.n = 'padre' THEN '0' ELSE '2' END);
  END LOOP;
END $o$;

-- ANON
SELECT pg_temp.chk('etapa1_roles','anon lee qr_codes', pg_temp.cnt(NULL,'anon','buscontrol.qr_codes'), 'ERR');
SELECT pg_temp.chk('etapa1_roles','anon lee admin_audit_log', pg_temp.cnt(NULL,'anon','buscontrol.admin_audit_log'), 'ERR');
SELECT pg_temp.chk('etapa1_roles','anon emite carnet', pg_temp.as_user(NULL,'anon',$$SELECT buscontrol.issue_qr_card('a0000000-0000-0000-0000-000000000002')$$), 'ERR');
SELECT pg_temp.chk('etapa1_roles','anon ejecuta is_web_admin', pg_temp.as_user(NULL,'anon',$$SELECT buscontrol.is_web_admin()$$), 'ERR');
SELECT pg_temp.chk('etapa1_roles','anon lee padron', pg_temp.cnt(NULL,'anon','public.social_bus_escolar'), 'ERR|0');

-- AUDITORIA
SELECT pg_temp.chk('etapa1_roles','auditoria qr_issue', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='qr_issue'), '2');
SELECT pg_temp.chk('etapa1_roles','auditoria qr_report_lost', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='qr_report_lost'), '1');

\echo === RESUMEN etapa1_roles ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
