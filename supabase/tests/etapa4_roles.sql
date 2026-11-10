-- Matriz de roles de la Etapa 4 (PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025 a 038.
-- Cada funcion nueva del panel se llama como administrador, chofer, asistenta, coordinador, padre y anon.
-- Se espera: el administrador pasa el control de permisos (puede fallar por otra razon, p. ej. argumentos
-- vacios, pero NO por permisos) y todos los demas son rechazados POR PERMISOS. Luego se intenta escribir
-- directo en las tablas nuevas con cada rol: no debe cambiar nada.
CREATE TEMP TABLE res (n serial, suite text, label text, esp text, obt text, ok boolean);

-- Resultado de ejecutar p_sql como p_role: 'DENIED' (rechazado por permisos), 'OK' o 'ERR: otra razon'.
CREATE OR REPLACE FUNCTION pg_temp.who(p_uid text, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"'||p_role||'"}'
         ELSE '{"sub":"'||p_uid||'","role":"'||p_role||'"}' END, true);
  EXECUTE 'SET LOCAL ROLE ' || p_role;
  BEGIN
    EXECUTE p_sql;
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN
    r := CASE WHEN SQLERRM ~* 'administrador|iniciar sesión|permission denied|row-level security' THEN 'DENIED' ELSE 'ERR: ' || SQLERRM END;
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

-- Preparacion: una fila de cada tabla nueva (el chofer, la asistenta y el coordinador existen en etapa1_roles)
DELETE FROM buscontrol.admin_audit_log;
DELETE FROM buscontrol.qr_codes;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.bus_beneficiaries;
INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by) VALUES (:'S1', :'ADM');
INSERT INTO buscontrol.bus_guardians (id, full_name) VALUES ('c1000000-0000-0000-0000-0000000000a1','Rosa Prueba');
INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, is_primary) VALUES (:'S1','c1000000-0000-0000-0000-0000000000a1', true);
INSERT INTO buscontrol.qr_codes (student_id, code, issued_by) VALUES (:'S1', 'BU0098', :'ADM');
INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, details) VALUES (:'ADM', 'qr_print', 'qr_codes', '{}');

-- 1) Funciones: administrador vs los demas
DO $$
DECLARE
  roles text[][] := ARRAY[
    ['b0000000-0000-0000-0000-000000000001','authenticated','administrador'],
    ['b0000000-0000-0000-0000-000000000002','authenticated','chofer'],
    ['b0000000-0000-0000-0000-000000000003','authenticated','asistenta'],
    ['b0000000-0000-0000-0000-000000000005','authenticated','coordinador'],
    ['b0000000-0000-0000-0000-000000000004','authenticated','padre'],
    [NULL,'anon','sin sesion']];
  llamadas text[] := ARRAY[
    'admin_dashboard()',
    'admin_guardian_detail(NULL::uuid)',
    'admin_list_audit()',
    'admin_list_cards()',
    'admin_list_guardians()',
    'admin_list_students()',
    'create_guardian(NULL,NULL,NULL,NULL,NULL)',
    'deactivate_beneficiary(NULL::uuid,NULL)',
    'enroll_beneficiary(NULL::uuid)',
    'issue_qr_card(NULL::uuid,NULL)',
    'issue_qr_cards(NULL::uuid[])',
    'link_guardian(NULL::uuid,NULL::uuid,NULL,NULL::boolean)',
    'link_guardian_account(NULL::uuid,NULL::uuid)',
    'log_admin_session(NULL,NULL,NULL)',
    'log_guardian_account_action(NULL::uuid,NULL)',
    'log_qr_print(NULL::uuid[],NULL)',
    'report_qr_lost(NULL::uuid,NULL)',
    'set_guardian_active(NULL::uuid,NULL::boolean)',
    'set_primary_guardian(NULL::uuid,NULL::uuid)',
    'unlink_guardian(NULL::uuid,NULL::uuid)',
    'unlink_guardian_account(NULL::uuid)',
    'update_guardian(NULL::uuid,NULL,NULL,NULL,NULL,NULL)'];
  i int; j int; r text;
BEGIN
  FOR i IN 1..array_length(llamadas, 1) LOOP
    FOR j IN 1..array_length(roles, 1) LOOP
      r := pg_temp.who(roles[j][1], roles[j][2], 'SELECT * FROM buscontrol.' || llamadas[i]);
      IF roles[j][3] = 'administrador' THEN
        PERFORM pg_temp.chk('etapa4_roles', llamadas[i] || ' como administrador no es rechazada por permisos', CASE WHEN r = 'DENIED' THEN 'DENIED' ELSE 'pasa' END, 'pasa');
      ELSE
        PERFORM pg_temp.chk('etapa4_roles', llamadas[i] || ' como ' || roles[j][3] || ' es rechazada', r, 'DENIED');
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 2) Tablas nuevas: ningun rol (ni el administrador, ni el coordinador) escribe directo; solo por las funciones.
-- Desde la 040 no queda ninguna politica de escritura directa (antes el coordinador podia en apoderados y vinculos).
DO $$
DECLARE
  roles text[][] := ARRAY[
    ['b0000000-0000-0000-0000-000000000001','authenticated','administrador'],
    ['b0000000-0000-0000-0000-000000000002','authenticated','chofer'],
    ['b0000000-0000-0000-0000-000000000003','authenticated','asistenta'],
    ['b0000000-0000-0000-0000-000000000005','authenticated','coordinador'],
    ['b0000000-0000-0000-0000-000000000004','authenticated','padre'],
    [NULL,'anon','sin sesion']];
  j int; t text;
BEGIN
  FOR j IN 1..array_length(roles, 1) LOOP
    PERFORM pg_temp.who(roles[j][1], roles[j][2], 'DELETE FROM buscontrol.admin_audit_log');
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$UPDATE buscontrol.admin_audit_log SET action = 'HACK'$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity) VALUES ('b0000000-0000-0000-0000-000000000001','HACK','x')$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], 'DELETE FROM buscontrol.qr_codes');
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$UPDATE buscontrol.qr_codes SET reason = 'HACK'$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$INSERT INTO buscontrol.qr_codes (student_id, code, issued_by) VALUES ('a0000000-0000-0000-0000-000000000002','HACK','b0000000-0000-0000-0000-000000000001')$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], 'DELETE FROM buscontrol.bus_beneficiaries');
    PERFORM pg_temp.who(roles[j][1], roles[j][2], 'UPDATE buscontrol.bus_beneficiaries SET is_active = false');
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by) VALUES ('a0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001')$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], 'DELETE FROM buscontrol.bus_guardians');
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$UPDATE buscontrol.bus_guardians SET notes = 'HACK'$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$INSERT INTO buscontrol.bus_guardians (full_name) VALUES ('HACK')$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], 'DELETE FROM buscontrol.bus_student_guardians');
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$UPDATE buscontrol.bus_student_guardians SET relationship = 'HACK'$q$);
    PERFORM pg_temp.who(roles[j][1], roles[j][2], $q$INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id) VALUES ('a0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-0000000000a1')$q$);
  END LOOP;
END $$;
SELECT pg_temp.chk('etapa4_roles','auditoria intacta tras escrituras directas de todos los roles', (SELECT count(*) || ';' || count(*) FILTER (WHERE action = 'qr_print') FROM buscontrol.admin_audit_log), '1;1');
SELECT pg_temp.chk('etapa4_roles','carnets intactos', (SELECT count(*) || ';' || count(*) FILTER (WHERE reason IS NULL AND code = 'BU0098') FROM buscontrol.qr_codes), '1;1');
SELECT pg_temp.chk('etapa4_roles','beneficiarios intactos', (SELECT count(*) || ';' || count(*) FILTER (WHERE is_active) FROM buscontrol.bus_beneficiaries), '1;1');
SELECT pg_temp.chk('etapa4_roles','apoderados intactos', (SELECT count(*) || ';' || count(*) FILTER (WHERE notes IS NULL AND full_name = 'Rosa Prueba') FROM buscontrol.bus_guardians), '1;1');
SELECT pg_temp.chk('etapa4_roles','vinculos intactos', (SELECT count(*) || ';' || count(*) FILTER (WHERE relationship <> 'HACK') FROM buscontrol.bus_student_guardians), '1;1');

-- 2b) La politica heredada del coordinador ya no existe (040) y nadie tiene permisos de escritura directa
SELECT pg_temp.chk('etapa4_roles','no quedan politicas de escritura directa en apoderados ni vinculos', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'buscontrol' AND tablename IN ('bus_guardians','bus_student_guardians') AND cmd IN ('ALL','INSERT','UPDATE','DELETE')), '0');
SELECT pg_temp.chk('etapa4_roles','authenticated no tiene INSERT/UPDATE/DELETE en apoderados ni vinculos', (SELECT count(*)::text FROM information_schema.role_table_grants WHERE table_schema = 'buscontrol' AND table_name IN ('bus_guardians','bus_student_guardians') AND grantee = 'authenticated' AND privilege_type IN ('INSERT','UPDATE','DELETE')), '0');

-- 3) Lectura directa. Solo el administrador ve auditoria, carnets y beneficiarios. Los operadores (chofer, asistenta,
-- coordinador) SI leen apoderados y vinculos por diseno (politicas ops_read_*): el padre solo ve lo suyo.
DO $$
DECLARE
  roles text[][] := ARRAY[
    ['b0000000-0000-0000-0000-000000000002','chofer'],
    ['b0000000-0000-0000-0000-000000000003','asistenta'],
    ['b0000000-0000-0000-0000-000000000005','coordinador'],
    ['b0000000-0000-0000-0000-000000000004','padre']];
  tablas text[] := ARRAY['admin_audit_log','qr_codes','bus_beneficiaries'];
  i int; j int; n text;
BEGIN
  FOR i IN 1..array_length(tablas, 1) LOOP
    FOR j IN 1..array_length(roles, 1) LOOP
      PERFORM set_config('request.jwt.claims', '{"sub":"' || roles[j][1] || '","role":"authenticated"}', true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      BEGIN
        EXECUTE 'SELECT count(*)::text FROM buscontrol.' || tablas[i] INTO n;
      EXCEPTION WHEN OTHERS THEN
        n := 'ERR';
      END;
      EXECUTE 'RESET ROLE';
      PERFORM pg_temp.chk('etapa4_roles', roles[j][2] || ' no lee ' || tablas[i], CASE WHEN n IN ('0','ERR') THEN 'no ve' ELSE 'VE ' || n END, 'no ve');
    END LOOP;
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    BEGIN
      EXECUTE 'SELECT count(*)::text FROM buscontrol.' || tablas[i] INTO n;
    EXCEPTION WHEN OTHERS THEN
      n := 'ERR';
    END;
    EXECUTE 'RESET ROLE';
    PERFORM pg_temp.chk('etapa4_roles', 'sin sesion no lee ' || tablas[i], CASE WHEN n IN ('0','ERR') THEN 'no ve' ELSE 'VE ' || n END, 'no ve');
  END LOOP;
END $$;

-- 3b) Apoderados y vinculos: el padre sin cuenta vinculada no ve nada; sin sesion tampoco; los operadores si ven
DO $$
DECLARE n text; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bus_guardians','bus_student_guardians'] LOOP
    PERFORM set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE 'SELECT count(*)::text FROM buscontrol.' || t INTO n;
    EXECUTE 'RESET ROLE';
    PERFORM pg_temp.chk('etapa4_roles', 'padre sin vinculo ve 0 filas de ' || t, n, '0');
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    BEGIN
      EXECUTE 'SELECT count(*)::text FROM buscontrol.' || t INTO n;
    EXCEPTION WHEN OTHERS THEN n := '0';
    END;
    EXECUTE 'RESET ROLE';
    PERFORM pg_temp.chk('etapa4_roles', 'sin sesion ve 0 filas de ' || t, n, '0');
    PERFORM set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE 'SELECT count(*)::text FROM buscontrol.' || t INTO n;
    EXECUTE 'RESET ROLE';
    PERFORM pg_temp.chk('etapa4_roles', 'POR DISENO: el chofer ve ' || t, n, '1');
  END LOOP;
END $$;

-- Limpieza
DELETE FROM buscontrol.admin_audit_log;
DELETE FROM buscontrol.qr_codes;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.bus_beneficiaries;

\echo === RESUMEN etapa4_roles ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
