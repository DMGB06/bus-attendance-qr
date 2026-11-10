-- Pruebas 037 (Dashboard, PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025 a 037.
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
\set S4 'a0000000-0000-0000-0000-000000000004'
\set S5 'a0000000-0000-0000-0000-000000000005'

-- Preparacion: S1 vigente con apoderado activo; S2 vencido (14 meses) con apoderado activo con cuenta;
-- S3 sin carnet y con un apoderado INACTIVO; S4 perdido (emitido hace 2 meses) sin apoderado; S5 sin alta.
INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES
 (:'S3','ALUMNO PRUEBA TRES','10000003',NULL),
 (:'S4','ALUMNO PRUEBA CUATRO','10000004','BU0100'),
 (:'S5','ALUMNO PRUEBA CINCO','10000005','BU0101')
ON CONFLICT DO NOTHING;
DELETE FROM buscontrol.qr_codes;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.bus_beneficiaries;
SELECT pg_temp.chk('etapa4_dashboard','alta S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','alta S2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S2')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','alta S3', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S3')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','alta S4', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S4')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','carnet S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','carnet S2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S2')), 'OK');
UPDATE buscontrol.qr_codes SET issued_at = now() - interval '14 months' WHERE student_id = :'S2';
SELECT pg_temp.chk('etapa4_dashboard','carnet S4', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S4')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','S4 perdido', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.report_qr_lost(%L,'se perdio')$$,:'S4')), 'OK');
UPDATE buscontrol.qr_codes SET issued_at = now() - interval '2 months' WHERE student_id = :'S4';
INSERT INTO buscontrol.bus_guardians (id, full_name, is_active, auth_user_id) VALUES
 ('c1000000-0000-0000-0000-0000000000a1','Apoderado A', true, NULL),
 ('c1000000-0000-0000-0000-0000000000a2','Apoderado B inactivo', false, NULL),
 ('c1000000-0000-0000-0000-0000000000a3','Apoderado C con cuenta', true, :'PAD');
INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, is_primary) VALUES
 (:'S1','c1000000-0000-0000-0000-0000000000a1', true),
 (:'S2','c1000000-0000-0000-0000-0000000000a3', true),
 (:'S3','c1000000-0000-0000-0000-0000000000a2', true);

-- Solo el administrador
SELECT pg_temp.chk('etapa4_dashboard','padre no ve el dashboard', pg_temp.val(:'PAD','authenticated','SELECT buscontrol.admin_dashboard()::text'), 'ERR');
SELECT pg_temp.chk('etapa4_dashboard','chofer no ve el dashboard', pg_temp.val(:'CHO','authenticated','SELECT buscontrol.admin_dashboard()::text'), 'ERR');
SELECT pg_temp.chk('etapa4_dashboard','anon no ve el dashboard', pg_temp.val(NULL,'anon','SELECT buscontrol.admin_dashboard()::text'), 'ERR');

-- Numeros
SELECT pg_temp.chk('etapa4_dashboard','beneficiarios activos (S5 no cuenta)', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'beneficiarios_activos')$$), '4');
SELECT pg_temp.chk('etapa4_dashboard','carnets vigentes', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->'carnets'->>'vigente')$$), '1');
SELECT pg_temp.chk('etapa4_dashboard','carnets vencidos', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->'carnets'->>'vencido')$$), '1');
SELECT pg_temp.chk('etapa4_dashboard','carnets perdidos', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->'carnets'->>'perdido')$$), '1');
SELECT pg_temp.chk('etapa4_dashboard','sin carnet', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->'carnets'->>'sin_carnet')$$), '1');
SELECT pg_temp.chk('etapa4_dashboard','apoderados activos (el inactivo no cuenta)', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'apoderados_activos')$$), '2');
SELECT pg_temp.chk('etapa4_dashboard','apoderados con cuenta', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'apoderados_con_cuenta')$$), '1');
SELECT pg_temp.chk('etapa4_dashboard','con apoderado activo', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'con_apoderado')$$), '2');
SELECT pg_temp.chk('etapa4_dashboard','sin apoderado (el inactivo no cuenta)', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'sin_apoderado')$$), '2');
SELECT pg_temp.chk('etapa4_dashboard','emitidos este mes', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'emitidos_mes')$$), '1');
SELECT pg_temp.chk('etapa4_dashboard','emitidos el mes anterior', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'emitidos_mes_anterior')$$), '0');
SELECT pg_temp.chk('etapa4_dashboard','seis meses con ceros', pg_temp.val(:'ADM','authenticated',$$SELECT jsonb_array_length(buscontrol.admin_dashboard()->'emitidos_por_mes')::text$$), '6');
SELECT pg_temp.chk('etapa4_dashboard','suma de los seis meses (el de hace 14 meses no entra)', pg_temp.val(:'ADM','authenticated',$$SELECT sum((x->>'n')::int)::text FROM jsonb_array_elements(buscontrol.admin_dashboard()->'emitidos_por_mes') x$$), '2');
SELECT pg_temp.chk('etapa4_dashboard','el ultimo mes es el actual (Lima)', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->'emitidos_por_mes'->5->>'mes')$$), to_char(now() AT TIME ZONE 'America/Lima', 'YYYY-MM'));

-- Un alumno dado de baja deja de contar
SELECT pg_temp.chk('etapa4_dashboard','baja S3', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.deactivate_beneficiary(%L,'prueba')$$,:'S3')), 'OK');
SELECT pg_temp.chk('etapa4_dashboard','tras la baja: 3 activos', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->>'beneficiarios_activos')$$), '3');
SELECT pg_temp.chk('etapa4_dashboard','tras la baja: sin carnet 0', pg_temp.val(:'ADM','authenticated',$$SELECT (buscontrol.admin_dashboard()->'carnets'->>'sin_carnet')$$), '0');

-- Limpieza
DELETE FROM buscontrol.qr_codes WHERE student_id IN (:'S3',:'S4',:'S5');
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.bus_beneficiaries WHERE student_id IN (:'S3',:'S4',:'S5');
DELETE FROM public.social_bus_escolar WHERE id IN (:'S3',:'S4',:'S5');

\echo === RESUMEN etapa4_dashboard ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
