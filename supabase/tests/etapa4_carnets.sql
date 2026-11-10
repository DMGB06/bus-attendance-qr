-- Pruebas 036 (lista de carnets y auditoria de impresion, PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025 a 036.
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
\set S3 'a0000000-0000-0000-0000-000000000003'
\set S4 'a0000000-0000-0000-0000-000000000004'
\set S5 'a0000000-0000-0000-0000-000000000005'

-- Preparacion
-- S1 beneficiario con carnet vigente de este anio; S2 beneficiario con carnet vigente de hace un anio (vencido);
-- S3 beneficiario sin carnet y sin codigo; S4 beneficiario con carnet perdido; S5 sin alta (no debe aparecer)
INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES
 (:'S3','ALUMNO PRUEBA TRES','10000003',NULL),
 (:'S4','ALUMNO PRUEBA CUATRO','10000004','BU0100'),
 (:'S5','ALUMNO PRUEBA CINCO','10000005','BU0101')
ON CONFLICT DO NOTHING;
DELETE FROM buscontrol.qr_codes;
DELETE FROM buscontrol.bus_beneficiaries;
DELETE FROM buscontrol.admin_audit_log WHERE action = 'qr_print';
SELECT pg_temp.chk('etapa4_carnets','alta S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','alta S2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S2')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','alta S3', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S3')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','alta S4', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.enroll_beneficiary(%L)$$,:'S4')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','carnet S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S1')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','carnet S2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S2')), 'OK');
UPDATE buscontrol.qr_codes SET issued_at = now() - interval '14 months' WHERE student_id = :'S2';
SELECT pg_temp.chk('etapa4_carnets','carnet S4', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_card(%L)$$,:'S4')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','S4 perdido', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.report_qr_lost(%L,'se perdio')$$,:'S4')), 'OK');

-- Solo el administrador
SELECT pg_temp.chk('etapa4_carnets','padre no lista', pg_temp.cnt(:'PAD','authenticated','buscontrol.admin_list_cards()'), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','chofer no lista', pg_temp.cnt(:'CHO','authenticated','buscontrol.admin_list_cards()'), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','anon no lista', pg_temp.cnt(NULL,'anon','buscontrol.admin_list_cards()'), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','padre no audita impresion', pg_temp.as_user(:'PAD','authenticated',format($$SELECT buscontrol.log_qr_print(ARRAY[%L]::uuid[],'pdf')$$,:'S1')), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','anon no audita impresion', pg_temp.as_user(NULL,'anon',format($$SELECT buscontrol.log_qr_print(ARRAY[%L]::uuid[],'pdf')$$,:'S1')), 'ERR');

-- Lista y filtros: solo beneficiarios activos (S5 no aparece)
SELECT pg_temp.chk('etapa4_carnets','lista 4 beneficiarios', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_cards()'), '4');
SELECT pg_temp.chk('etapa4_carnets','filtro vigente', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards(NULL,'vigente')$$), '1');
SELECT pg_temp.chk('etapa4_carnets','filtro vencido', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards(NULL,'vencido')$$), '1');
SELECT pg_temp.chk('etapa4_carnets','filtro por_emitir', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards(NULL,'por_emitir')$$), '3');
SELECT pg_temp.chk('etapa4_carnets','filtro perdido', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards(NULL,'perdido')$$), '1');
SELECT pg_temp.chk('etapa4_carnets','filtro invalido (bloqueado)', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards(NULL,'x')$$), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','busca por codigo', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards('bu0100')$$), '1');
SELECT pg_temp.chk('etapa4_carnets','busca por nombre', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards('prueba tres')$$), '1');
SELECT pg_temp.chk('etapa4_carnets','busca por DNI', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards('1000000')$$), '4');
SELECT pg_temp.chk('etapa4_carnets','% no es comodin', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards('%')$$), '0');
SELECT pg_temp.chk('etapa4_carnets','comilla no rompe', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_cards('o''brien')$$), '0');

-- Estado de cada fila
SELECT pg_temp.chk('etapa4_carnets','S1 vigente', pg_temp.val(:'ADM','authenticated',format($$SELECT estado_carnet FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE student_id=%L$$,:'S1')), 'vigente');
SELECT pg_temp.chk('etapa4_carnets','S2 vencido', pg_temp.val(:'ADM','authenticated',format($$SELECT estado_carnet FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE student_id=%L$$,:'S2')), 'vencido');
SELECT pg_temp.chk('etapa4_carnets','S3 sin carnet y sin codigo', pg_temp.val(:'ADM','authenticated',format($$SELECT estado_carnet||';'||coalesce(codigo,'NULL') FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE student_id=%L$$,:'S3')), 'sin_carnet;NULL');
SELECT pg_temp.chk('etapa4_carnets','S4 perdido', pg_temp.val(:'ADM','authenticated',format($$SELECT estado_carnet FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE student_id=%L$$,:'S4')), 'perdido');
SELECT pg_temp.chk('etapa4_carnets','S1 anio de emision', pg_temp.val(:'ADM','authenticated',format($$SELECT card_year::text FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE student_id=%L$$,:'S1')), (extract(year FROM now() AT TIME ZONE 'America/Lima'))::int::text);

-- Paginacion
SELECT pg_temp.chk('etapa4_carnets','pagina de 2 filas', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_cards(NULL,NULL,2,2)'), '2');
SELECT pg_temp.chk('etapa4_carnets','total con paginacion', pg_temp.val(:'ADM','authenticated','SELECT total FROM buscontrol.admin_list_cards(NULL,NULL,1,0)'), '4');
SELECT pg_temp.chk('etapa4_carnets','offset negativo (bloqueado)', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_cards(NULL,NULL,10,-1)'), 'ERR');

-- Auditoria de impresion
SELECT pg_temp.chk('etapa4_carnets','admin audita impresion', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.log_qr_print(ARRAY[%L,%L]::uuid[],'pdf')$$,:'S1',:'S2')), 'OK');
SELECT pg_temp.chk('etapa4_carnets','una fila qr_print con formato y cantidad', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='qr_print' AND details->>'format'='pdf' AND (details->>'count')::int = 2), '1');
SELECT pg_temp.chk('etapa4_carnets','formato invalido (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.log_qr_print(ARRAY[%L]::uuid[],'exe')$$,:'S1')), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','lista vacia (bloqueada)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.log_qr_print(ARRAY[]::uuid[],'pdf')$$), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','mas de 200 (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.log_qr_print(ARRAY(SELECT gen_random_uuid() FROM generate_series(1,201)),'pdf')$$), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','alumno inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.log_qr_print(ARRAY['a0000000-0000-0000-0000-0000000000ff']::uuid[],'png')$$), 'ERR');

-- Emision de varios carnets en una transaccion (issue_qr_cards)
SELECT pg_temp.chk('etapa4_carnets','padre no emite varios', pg_temp.as_user(:'PAD','authenticated',format($$SELECT buscontrol.issue_qr_cards(ARRAY[%L]::uuid[])$$,:'S2')), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','chofer no emite varios', pg_temp.as_user(:'CHO','authenticated',format($$SELECT buscontrol.issue_qr_cards(ARRAY[%L]::uuid[])$$,:'S2')), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','anon no emite varios', pg_temp.as_user(NULL,'anon',format($$SELECT buscontrol.issue_qr_cards(ARRAY[%L]::uuid[])$$,:'S2')), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','lista vacia (bloqueada)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.issue_qr_cards(ARRAY[]::uuid[])$$), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','mas de 200 (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.issue_qr_cards(ARRAY(SELECT gen_random_uuid() FROM generate_series(1,201)))$$), 'ERR');
-- Todos o ninguno: S3 no tiene codigo, asi que S2 tampoco se emite
SELECT pg_temp.chk('etapa4_carnets','uno sin codigo: falla todo', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_cards(ARRAY[%L,%L]::uuid[])$$,:'S2',:'S3')), 'ERR');
SELECT pg_temp.chk('etapa4_carnets','S2 sigue vencido (no se emitio nada)', pg_temp.val(:'ADM','authenticated',format($$SELECT estado_carnet || ';' || (SELECT count(*) FROM buscontrol.qr_codes WHERE student_id = %L)::text FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE student_id = %L$$,:'S2',:'S2')), 'vencido;1');
CREATE TEMP TABLE n_issue AS SELECT count(*) AS c FROM buscontrol.admin_audit_log WHERE action = 'qr_issue';
SELECT pg_temp.chk('etapa4_carnets','emite S2 (vencido) y S4 (perdido) juntos: 2', pg_temp.val(:'ADM','authenticated',format($$SELECT buscontrol.issue_qr_cards(ARRAY[%L,%L,%L]::uuid[])::text$$,:'S2',:'S4',:'S2')), '2');
SELECT pg_temp.chk('etapa4_carnets','S2 y S4 quedan vigentes', pg_temp.val(:'ADM','authenticated',$$SELECT string_agg(estado_carnet, ',' ORDER BY nombre) FROM buscontrol.admin_list_cards(NULL,NULL,20,0) WHERE nombre IN ('ALUMNO PRUEBA DOS','ALUMNO PRUEBA CUATRO')$$), 'vigente,vigente');
SELECT pg_temp.chk('etapa4_carnets','el carnet vencido de S2 quedo reemplazado', (SELECT count(*)::text FROM buscontrol.qr_codes WHERE student_id = :'S2' AND status = 'reemplazado'), '1');
SELECT pg_temp.chk('etapa4_carnets','auditoria: una qr_issue por cada alumno emitido (2 nuevas)', (SELECT (count(*) - (SELECT c FROM n_issue))::text FROM buscontrol.admin_audit_log WHERE action = 'qr_issue'), '2');

-- Limpieza: los alumnos extra no deben afectar a las otras suites
DELETE FROM buscontrol.qr_codes WHERE student_id IN (:'S3',:'S4',:'S5');
DELETE FROM buscontrol.bus_beneficiaries WHERE student_id IN (:'S3',:'S4',:'S5');
DELETE FROM public.social_bus_escolar WHERE id IN (:'S3',:'S4',:'S5');

\echo === RESUMEN etapa4_carnets ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
