-- Pruebas 033 (alumnos de baja o sin alta ocultos en el movil, PASS/FALLA).
-- Requiere etapa1_roles.sql y aplicadas 025 a 033 (no el backfill: aqui se controla quien esta dado de alta).
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

-- Cuenta filas de una consulta (from_sql = "tabla" o "(subconsulta) x") con el rol indicado.
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
\set ASI 'b0000000-0000-0000-0000-000000000003'
\set PAD 'b0000000-0000-0000-0000-000000000004'
\set COO 'b0000000-0000-0000-0000-000000000005'
\set S1 'a0000000-0000-0000-0000-000000000001'
\set S2 'a0000000-0000-0000-0000-000000000002'

-- Preparacion: el padre es apoderado activo de S1 y S2; solo S1 esta dado de alta.
DELETE FROM buscontrol.bus_beneficiaries;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
INSERT INTO buscontrol.bus_guardians (id, full_name, auth_user_id, is_active) VALUES ('c1000000-0000-0000-0000-000000000001','Padre Prueba', :'PAD', true);
INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id) VALUES (:'S1','c1000000-0000-0000-0000-000000000001'), (:'S2','c1000000-0000-0000-0000-000000000001');
SELECT pg_temp.chk('etapa4_bajas','alta de S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S1')), 'OK');

-- Con S1 de alta y S2 sin alta
SELECT pg_temp.chk('etapa4_bajas','chofer ve solo S1', pg_temp.cnt(:'CHO','authenticated','public.social_bus_escolar'), '1');
SELECT pg_temp.chk('etapa4_bajas','asistenta ve solo S1', pg_temp.cnt(:'ASI','authenticated','public.social_bus_escolar'), '1');
SELECT pg_temp.chk('etapa4_bajas','coordinador ve solo S1', pg_temp.cnt(:'COO','authenticated','public.social_bus_escolar'), '1');
SELECT pg_temp.chk('etapa4_bajas','padre lee solo S1 (lectura directa)', pg_temp.cnt(:'PAD','authenticated','public.social_bus_escolar'), '1');
SELECT pg_temp.chk('etapa4_bajas','padre ve solo S1 (get_my_guardian_students)', pg_temp.cnt(:'PAD','authenticated','buscontrol.get_my_guardian_students()'), '1');
SELECT pg_temp.chk('etapa4_bajas','admin sigue viendo los 2', pg_temp.cnt(:'ADM','authenticated','public.social_bus_escolar'), '2');
SELECT pg_temp.chk('etapa4_bajas','asistencia permitida para S1', pg_temp.cnt(:'CHO','authenticated',format('(SELECT 1 WHERE buscontrol.student_exists_active(%L)) x',:'S1')), '1');
SELECT pg_temp.chk('etapa4_bajas','asistencia rechazada para S2 (sin alta)', pg_temp.cnt(:'CHO','authenticated',format('(SELECT 1 WHERE buscontrol.student_exists_active(%L)) x',:'S2')), '0');

-- Baja de S1: desaparece del movil, el admin lo sigue viendo
SELECT pg_temp.chk('etapa4_bajas','baja de S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.deactivate_beneficiary(%L,'prueba')$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_bajas','chofer ya no ve nada', pg_temp.cnt(:'CHO','authenticated','public.social_bus_escolar'), '0');
SELECT pg_temp.chk('etapa4_bajas','padre ya no ve nada (directa)', pg_temp.cnt(:'PAD','authenticated','public.social_bus_escolar'), '0');
SELECT pg_temp.chk('etapa4_bajas','padre ya no ve nada (funcion)', pg_temp.cnt(:'PAD','authenticated','buscontrol.get_my_guardian_students()'), '0');
SELECT pg_temp.chk('etapa4_bajas','asistencia rechazada para S1 de baja', pg_temp.cnt(:'CHO','authenticated',format('(SELECT 1 WHERE buscontrol.student_exists_active(%L)) x',:'S1')), '0');
SELECT pg_temp.chk('etapa4_bajas','admin sigue viendo los 2 tras la baja', pg_temp.cnt(:'ADM','authenticated','public.social_bus_escolar'), '2');

-- Reactivar: vuelve
SELECT pg_temp.chk('etapa4_bajas','reactivar S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_bajas','chofer vuelve a ver S1', pg_temp.cnt(:'CHO','authenticated','public.social_bus_escolar'), '1');
SELECT pg_temp.chk('etapa4_bajas','padre vuelve a ver S1', pg_temp.cnt(:'PAD','authenticated','buscontrol.get_my_guardian_students()'), '1');

-- La funcion auxiliar no se expone a anonimos; anonimos siguen sin ver el padron
SELECT pg_temp.chk('etapa4_bajas','anon no llama is_active_beneficiary', pg_temp.as_user(NULL,'anon',format($$SELECT buscontrol.is_active_beneficiary(%L)$$,:'S1')), 'ERR');
SELECT pg_temp.chk('etapa4_bajas','anon no lee padron', pg_temp.cnt(NULL,'anon','public.social_bus_escolar'), 'ERR|0');

\echo === RESUMEN etapa4_bajas ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
