-- Pruebas 034 (lista de alumnos del administrador, PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025 a 034.
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

-- Cuenta filas de "tabla" o de una funcion con el rol indicado.
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

-- Primera columna de la primera fila como texto ('NULL' si no hay)
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
\set S3 'a0000000-0000-0000-0000-000000000003'

-- Preparacion: S1 beneficiario con carnet y apoderado principal, S2 de baja, S3 sin alta y sin codigo
INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES (:'S3','ALUMNO PRUEBA TRES','10000003',NULL) ON CONFLICT DO NOTHING;
DELETE FROM buscontrol.bus_beneficiaries;
DELETE FROM buscontrol.qr_codes;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
INSERT INTO buscontrol.bus_guardians (id, full_name, phone, is_active) VALUES ('c1000000-0000-0000-0000-000000000001','Rosa Prueba','987654321',true);
INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, is_primary) VALUES (:'S1','c1000000-0000-0000-0000-000000000001', true);
SELECT pg_temp.chk('etapa4_lista','alta S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_lista','alta S2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S2')), 'OK');
SELECT pg_temp.chk('etapa4_lista','baja S2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.deactivate_beneficiary(%L,'prueba')$$,:'S2')), 'OK');
SELECT pg_temp.chk('etapa4_lista','carnet S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S1')), 'OK');

-- Solo el administrador
SELECT pg_temp.chk('etapa4_lista','padre no lista', pg_temp.cnt(:'PAD','authenticated','buscontrol.admin_list_students()'), 'ERR');
SELECT pg_temp.chk('etapa4_lista','chofer no lista', pg_temp.cnt(:'CHO','authenticated','buscontrol.admin_list_students()'), 'ERR');
SELECT pg_temp.chk('etapa4_lista','anon no lista', pg_temp.cnt(NULL,'anon','buscontrol.admin_list_students()'), 'ERR');

-- Lista y filtros
SELECT pg_temp.chk('etapa4_lista','admin lista los 3', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_students()'), '3');
SELECT pg_temp.chk('etapa4_lista','estado beneficiario', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students(NULL,'beneficiario')$$), '1');
SELECT pg_temp.chk('etapa4_lista','estado baja', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students(NULL,'baja')$$), '1');
SELECT pg_temp.chk('etapa4_lista','estado sin_alta', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students(NULL,'sin_alta')$$), '1');
SELECT pg_temp.chk('etapa4_lista','estado invalido (bloqueado)', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students(NULL,'x')$$), 'ERR');
SELECT pg_temp.chk('etapa4_lista','busca por nombre sin importar mayusculas', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students('prueba tres')$$), '1');
SELECT pg_temp.chk('etapa4_lista','busca por codigo', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students('bu0098')$$), '1');
SELECT pg_temp.chk('etapa4_lista','busca por DNI', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students('1000000')$$), '3');
SELECT pg_temp.chk('etapa4_lista','el comodin % no es comodin', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students('%')$$), '0');
SELECT pg_temp.chk('etapa4_lista','el guion bajo no es comodin', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students('ALUMNO_PRUEBA')$$), '0');
SELECT pg_temp.chk('etapa4_lista','comilla simple no rompe', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_students('o''brien')$$), '0');

-- Datos de la fila
SELECT pg_temp.chk('etapa4_lista','S1: estado', pg_temp.val(:'ADM','authenticated',format($$SELECT estado FROM buscontrol.admin_list_students(NULL,NULL,20,0) WHERE student_id=%L$$,:'S1')), 'beneficiario');
SELECT pg_temp.chk('etapa4_lista','S1: apoderado principal', pg_temp.val(:'ADM','authenticated',format($$SELECT principal_name||';'||principal_phone FROM buscontrol.admin_list_students(NULL,NULL,20,0) WHERE student_id=%L$$,:'S1')), 'Rosa Prueba;987654321');
SELECT pg_temp.chk('etapa4_lista','S1: carnet vigente', pg_temp.val(:'ADM','authenticated',format($$SELECT card_status FROM buscontrol.admin_list_students(NULL,NULL,20,0) WHERE student_id=%L$$,:'S1')), 'vigente');
SELECT pg_temp.chk('etapa4_lista','S2: de baja y sin carnet', pg_temp.val(:'ADM','authenticated',format($$SELECT estado||';'||coalesce(card_status,'NULL') FROM buscontrol.admin_list_students(NULL,NULL,20,0) WHERE student_id=%L$$,:'S2')), 'baja;NULL');
SELECT pg_temp.chk('etapa4_lista','S3: sin codigo y sin alta', pg_temp.val(:'ADM','authenticated',format($$SELECT estado||';'||coalesce(codigo,'NULL') FROM buscontrol.admin_list_students(NULL,NULL,20,0) WHERE student_id=%L$$,:'S3')), 'sin_alta;NULL');

-- Paginacion: 1 por pagina, el total sigue siendo 3
SELECT pg_temp.chk('etapa4_lista','pagina de 1 fila', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_students(NULL,NULL,1,1)'), '1');
SELECT pg_temp.chk('etapa4_lista','total con paginacion', pg_temp.val(:'ADM','authenticated','SELECT total FROM buscontrol.admin_list_students(NULL,NULL,1,1)'), '3');
SELECT pg_temp.chk('etapa4_lista','limite enorme se recorta', pg_temp.val(:'ADM','authenticated','SELECT count(*) FROM buscontrol.admin_list_students(NULL,NULL,100000,0)'), '3');
SELECT pg_temp.chk('etapa4_lista','offset negativo (bloqueado)', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_students(NULL,NULL,10,-1)'), 'ERR');

-- Limpieza: el alumno extra no debe afectar a las otras suites
DELETE FROM buscontrol.qr_codes WHERE student_id = :'S3';
DELETE FROM public.social_bus_escolar WHERE id = :'S3';

\echo === RESUMEN etapa4_lista ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
