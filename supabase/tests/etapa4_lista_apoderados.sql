-- Pruebas 035 (lista y detalle de apoderados del administrador, PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025 a 035.
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

CREATE OR REPLACE FUNCTION pg_temp.cnt(p_uid text, p_role text, p_from text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"'||p_role||'"}'
         ELSE '{"sub":"'||p_uid||'","role":"'||p_role||'"}' END, true);
  EXECUTE 'SET LOCAL ROLE ' || p_role;
  BEGIN
    EXECUTE 'SELECT count(*)::text FROM ' || p_from INTO r;
  EXCEPTION WHEN OTHERS THEN
    r := 'ERR: ' || SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.val(p_uid text, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"'||p_role||'"}'
         ELSE '{"sub":"'||p_uid||'","role":"'||p_role||'"}' END, true);
  EXECUTE 'SET LOCAL ROLE ' || p_role;
  BEGIN
    EXECUTE p_sql INTO r;
    r := coalesce(r, 'NULL');
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
\set CHO 'b0000000-0000-0000-0000-000000000002'
\set PAD 'b0000000-0000-0000-0000-000000000004'
\set S1 'a0000000-0000-0000-0000-000000000001'
\set S2 'a0000000-0000-0000-0000-000000000002'
\set G1 'c1000000-0000-0000-0000-000000000001'
\set G2 'c1000000-0000-0000-0000-000000000002'
\set G3 'c1000000-0000-0000-0000-000000000003'

-- Preparacion
-- G1 Rosa Prueba: activa, con cuenta (padre), principal de S1 y vinculada tambien a S2
-- G2 Julio Prueba: desactivado, con cuenta bloqueada (chofer de prueba como cuenta), vinculado a S2 como principal
-- G3 Elena Prueba: activa, sin cuenta y sin alumnos, sin telefono
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
INSERT INTO buscontrol.bus_guardians (id, full_name, phone, phone_normalized, dni, auth_user_id, is_active) VALUES
 (:'G1','Rosa Prueba','987654321','987654321','44123119',:'PAD',true),
 (:'G2','Julio Prueba','912345678','912345678',NULL,:'CHO',false),
 (:'G3','Elena Prueba',NULL,NULL,NULL,NULL,true);
INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES
 (:'S1',:'G1','madre',true),
 (:'S2',:'G2','padre',true),
 (:'S2',:'G1','tia',false);
-- la cuenta del chofer queda bloqueada (el trigger solo deja cambiarlo a service_role)
DO $$ BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  UPDATE buscontrol.app_profiles SET is_active = false WHERE id = 'b0000000-0000-0000-0000-000000000002';
END $$;

-- Solo el administrador
SELECT pg_temp.chk('etapa4_apoderados','padre no lista', pg_temp.cnt(:'PAD','authenticated','buscontrol.admin_list_guardians()'), 'ERR');
SELECT pg_temp.chk('etapa4_apoderados','anon no lista', pg_temp.cnt(NULL,'anon','buscontrol.admin_list_guardians()'), 'ERR');
SELECT pg_temp.chk('etapa4_apoderados','padre no ve detalle', pg_temp.val(:'PAD','authenticated',format($$SELECT buscontrol.admin_guardian_detail(%L)::text$$,:'G1')), 'ERR');

-- Lista y filtros
SELECT pg_temp.chk('etapa4_apoderados','lista los 3', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_guardians()'), '3');
SELECT pg_temp.chk('etapa4_apoderados','filtro activo', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians(NULL,'activo')$$), '2');
SELECT pg_temp.chk('etapa4_apoderados','filtro desactivado', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians(NULL,'desactivado')$$), '1');
SELECT pg_temp.chk('etapa4_apoderados','filtro con_cuenta', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians(NULL,'con_cuenta')$$), '2');
SELECT pg_temp.chk('etapa4_apoderados','filtro sin_cuenta', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians(NULL,'sin_cuenta')$$), '1');
SELECT pg_temp.chk('etapa4_apoderados','filtro invalido (bloqueado)', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians(NULL,'x')$$), 'ERR');
SELECT pg_temp.chk('etapa4_apoderados','busca por nombre', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians('ELENA')$$), '1');
SELECT pg_temp.chk('etapa4_apoderados','busca por telefono con formato', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians('+51 987-654')$$), '1');
SELECT pg_temp.chk('etapa4_apoderados','busca por DNI', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians('44123')$$), '1');
SELECT pg_temp.chk('etapa4_apoderados','% no es comodin', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians('%')$$), '0');
SELECT pg_temp.chk('etapa4_apoderados','comilla no rompe', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_guardians('o''brien')$$), '0');

-- Datos de la fila
SELECT pg_temp.chk('etapa4_apoderados','G1: 2 alumnos y cuenta', pg_temp.val(:'ADM','authenticated',format($$SELECT students_count||';'||has_account||';'||is_active FROM buscontrol.admin_list_guardians(NULL,NULL,20,0) WHERE guardian_id=%L$$,:'G1')), '2;true;true');
SELECT pg_temp.chk('etapa4_apoderados','G1: primer alumno por nombre', pg_temp.val(:'ADM','authenticated',format($$SELECT first_student FROM buscontrol.admin_list_guardians(NULL,NULL,20,0) WHERE guardian_id=%L$$,:'G1')), 'ALUMNO PRUEBA DOS');
SELECT pg_temp.chk('etapa4_apoderados','G3: sin alumnos ni cuenta', pg_temp.val(:'ADM','authenticated',format($$SELECT students_count||';'||has_account||';'||coalesce(first_student,'NULL') FROM buscontrol.admin_list_guardians(NULL,NULL,20,0) WHERE guardian_id=%L$$,:'G3')), '0;false;NULL');

-- Paginacion
SELECT pg_temp.chk('etapa4_apoderados','pagina de 1 fila', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_guardians(NULL,NULL,1,1)'), '1');
SELECT pg_temp.chk('etapa4_apoderados','total con paginacion', pg_temp.val(:'ADM','authenticated','SELECT total FROM buscontrol.admin_list_guardians(NULL,NULL,1,1)'), '3');
SELECT pg_temp.chk('etapa4_apoderados','offset negativo (bloqueado)', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_guardians(NULL,NULL,10,-1)'), 'ERR');

-- Detalle
SELECT pg_temp.chk('etapa4_apoderados','detalle G1: cuenta activa', pg_temp.val(:'ADM','authenticated',format($$SELECT (buscontrol.admin_guardian_detail(%L)->>'account_active')$$,:'G1')), 'true');
SELECT pg_temp.chk('etapa4_apoderados','detalle G2: cuenta bloqueada', pg_temp.val(:'ADM','authenticated',format($$SELECT (buscontrol.admin_guardian_detail(%L)->>'account_active')$$,:'G2')), 'false');
SELECT pg_temp.chk('etapa4_apoderados','detalle G3: sin cuenta', pg_temp.val(:'ADM','authenticated',format($$SELECT coalesce(buscontrol.admin_guardian_detail(%L)->>'account_active','NULL')$$,:'G3')), 'NULL');
SELECT pg_temp.chk('etapa4_apoderados','detalle G1: 2 alumnos', pg_temp.val(:'ADM','authenticated',format($$SELECT jsonb_array_length(buscontrol.admin_guardian_detail(%L)->'students')::text$$,:'G1')), '2');
SELECT pg_temp.chk('etapa4_apoderados','detalle G1: S2 no es principal y muestra quien lo es', pg_temp.val(:'ADM','authenticated',format($$SELECT (s->>'is_primary')||';'||(s->>'primary_name') FROM jsonb_array_elements(buscontrol.admin_guardian_detail(%L)->'students') s WHERE s->>'student_id'=%L$$,:'G1',:'S2')), 'false;Julio Prueba');
SELECT pg_temp.chk('etapa4_apoderados','detalle G1: no devuelve el DNI completo ni claves', pg_temp.val(:'ADM','authenticated',format($$SELECT (buscontrol.admin_guardian_detail(%L)::text ~ 'password|encrypted')::text$$,:'G1')), 'false');
SELECT pg_temp.chk('etapa4_apoderados','detalle inexistente (bloqueado)', pg_temp.val(:'ADM','authenticated',$$SELECT buscontrol.admin_guardian_detail('c1000000-0000-0000-0000-0000000000ff')::text$$), 'ERR');

-- Limpieza: devuelve la cuenta del chofer a activa y deja sin apoderados
DO $$ BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  UPDATE buscontrol.app_profiles SET is_active = true WHERE id = 'b0000000-0000-0000-0000-000000000002';
END $$;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;

\echo === RESUMEN etapa4_apoderados ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
