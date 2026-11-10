-- Pruebas 038 (Auditoria, PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025 a 038.
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

-- Preparacion: 6 movimientos conocidos (el alumno S1 y el apoderado A1 existen; el alumno de qr_issue ya no existe)
DELETE FROM buscontrol.admin_audit_log;
DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
INSERT INTO buscontrol.bus_guardians (id, full_name) VALUES ('c1000000-0000-0000-0000-0000000000a1','Rosa Prueba');
INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details, created_at) VALUES
 (:'ADM','qr_print','qr_codes',NULL, jsonb_build_object('format','pdf','count',3,'student_ids',jsonb_build_array(:'S1')), now()),
 (:'ADM','beneficiary_deactivate','bus_beneficiaries',:'S1', jsonb_build_object('student_id',:'S1','reason','se mudo'), now() - interval '1 day'),
 (:'ADM','guardian_link','bus_student_guardians','c1000000-0000-0000-0000-0000000000a1', jsonb_build_object('student_id',:'S1','is_primary',true), now() - interval '2 days'),
 (:'ADM','guardian_account_reset_password','bus_guardians','c1000000-0000-0000-0000-0000000000a1','{}'::jsonb, now() - interval '3 days'),
 (:'ADM','qr_issue','qr_codes',gen_random_uuid(), jsonb_build_object('student_id','a0000000-0000-0000-0000-0000000000ff','code','BU9999'), now() - interval '5 days'),
 (:'ADM','session_login','auth_session',:'ADM', jsonb_build_object('ip','1.2.3.4','user_agent','prueba','aal','aal2'), now() - interval '40 days');

-- Solo el administrador
SELECT pg_temp.chk('etapa4_auditoria','padre no ve la auditoria', pg_temp.cnt(:'PAD','authenticated','buscontrol.admin_list_audit()'), 'ERR');
SELECT pg_temp.chk('etapa4_auditoria','chofer no ve la auditoria', pg_temp.cnt(:'CHO','authenticated','buscontrol.admin_list_audit()'), 'ERR');
SELECT pg_temp.chk('etapa4_auditoria','anon no ve la auditoria', pg_temp.cnt(NULL,'anon','buscontrol.admin_list_audit()'), 'ERR');

-- Lista y orden
SELECT pg_temp.chk('etapa4_auditoria','6 movimientos', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_audit()'), '6');
SELECT pg_temp.chk('etapa4_auditoria','el mas reciente primero', pg_temp.val(:'ADM','authenticated',$$SELECT action FROM buscontrol.admin_list_audit() LIMIT 1$$), 'qr_print');
SELECT pg_temp.chk('etapa4_auditoria','el mas antiguo al final', pg_temp.val(:'ADM','authenticated',$$SELECT action FROM buscontrol.admin_list_audit(NULL,NULL,NULL,20,5)$$), 'session_login');

-- Tipos
SELECT pg_temp.chk('etapa4_auditoria','tipo alumnos', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,NULL,'alumnos')$$), '1');
SELECT pg_temp.chk('etapa4_auditoria','tipo apoderados', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,NULL,'apoderados')$$), '1');
SELECT pg_temp.chk('etapa4_auditoria','tipo cuentas', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,NULL,'cuentas')$$), '1');
SELECT pg_temp.chk('etapa4_auditoria','tipo carnets', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,NULL,'carnets')$$), '2');
SELECT pg_temp.chk('etapa4_auditoria','tipo sesiones', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,NULL,'sesiones')$$), '1');
SELECT pg_temp.chk('etapa4_auditoria','tipo invalido (bloqueado)', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,NULL,'x')$$), 'ERR');

-- Fechas (dia calendario de Lima, ambas incluidas)
SELECT pg_temp.chk('etapa4_auditoria','desde hace 3 dias: 4', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit((now() AT TIME ZONE 'America/Lima')::date - 3)$$), '4');
SELECT pg_temp.chk('etapa4_auditoria','hasta ayer: 5', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit(NULL,(now() AT TIME ZONE 'America/Lima')::date - 1)$$), '5');
SELECT pg_temp.chk('etapa4_auditoria','solo hace 5 dias: 1', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit((now() AT TIME ZONE 'America/Lima')::date - 5,(now() AT TIME ZONE 'America/Lima')::date - 5)$$), '1');
SELECT pg_temp.chk('etapa4_auditoria','hoy incluye lo de hoy', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit((now() AT TIME ZONE 'America/Lima')::date,(now() AT TIME ZONE 'America/Lima')::date,'carnets')$$), '1');
SELECT pg_temp.chk('etapa4_auditoria','rango invertido (bloqueado)', pg_temp.cnt(:'ADM','authenticated',$$buscontrol.admin_list_audit('2026-11-09','2026-11-01')$$), 'ERR');

-- Quien, sobre quien y detalle
SELECT pg_temp.chk('etapa4_auditoria','correo de quien lo hizo', pg_temp.val(:'ADM','authenticated',$$SELECT actor_email FROM buscontrol.admin_list_audit() LIMIT 1$$), (SELECT email::text FROM auth.users WHERE id = :'ADM'));
SELECT pg_temp.chk('etapa4_auditoria','baja: nombre del alumno', pg_temp.val(:'ADM','authenticated',$$SELECT student_name FROM buscontrol.admin_list_audit(NULL,NULL,'alumnos')$$), 'ALUMNO PRUEBA UNO');
SELECT pg_temp.chk('etapa4_auditoria','baja: motivo en el detalle', pg_temp.val(:'ADM','authenticated',$$SELECT details->>'reason' FROM buscontrol.admin_list_audit(NULL,NULL,'alumnos')$$), 'se mudo');
SELECT pg_temp.chk('etapa4_auditoria','vinculo: apoderado y alumno', pg_temp.val(:'ADM','authenticated',$$SELECT guardian_name || ';' || student_name FROM buscontrol.admin_list_audit(NULL,NULL,'apoderados')$$), 'Rosa Prueba;ALUMNO PRUEBA UNO');
SELECT pg_temp.chk('etapa4_auditoria','cuenta: apoderado', pg_temp.val(:'ADM','authenticated',$$SELECT guardian_name FROM buscontrol.admin_list_audit(NULL,NULL,'cuentas')$$), 'Rosa Prueba');
SELECT pg_temp.chk('etapa4_auditoria','alumno que ya no existe: sin nombre', pg_temp.val(:'ADM','authenticated',$$SELECT student_name FROM buscontrol.admin_list_audit(NULL,NULL,'carnets') WHERE action = 'qr_issue'$$), 'NULL');
SELECT pg_temp.chk('etapa4_auditoria','impresion: cantidad y formato sin ids', pg_temp.val(:'ADM','authenticated',$$SELECT details::text FROM buscontrol.admin_list_audit(NULL,NULL,'carnets') WHERE action = 'qr_print'$$), '{"count": 3, "format": "pdf"}');
SELECT pg_temp.chk('etapa4_auditoria','sesion: sin ip ni navegador', pg_temp.val(:'ADM','authenticated',$$SELECT details::text FROM buscontrol.admin_list_audit(NULL,NULL,'sesiones')$$), '{}');

-- Paginacion
SELECT pg_temp.chk('etapa4_auditoria','pagina de 2 filas', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_audit(NULL,NULL,NULL,2,4)'), '2');
SELECT pg_temp.chk('etapa4_auditoria','total con paginacion', pg_temp.val(:'ADM','authenticated','SELECT total FROM buscontrol.admin_list_audit(NULL,NULL,NULL,1,0)'), '6');
SELECT pg_temp.chk('etapa4_auditoria','offset negativo (bloqueado)', pg_temp.cnt(:'ADM','authenticated','buscontrol.admin_list_audit(NULL,NULL,NULL,10,-1)'), 'ERR');

-- Solo lectura: el administrador no puede borrar el registro
SELECT pg_temp.chk('etapa4_auditoria','admin no borra el registro', pg_temp.as_user(:'ADM','authenticated','DELETE FROM buscontrol.admin_audit_log'), 'ERR|OK rows=0');
SELECT pg_temp.chk('etapa4_auditoria','el registro sigue completo', (SELECT count(*)::text FROM buscontrol.admin_audit_log), '6');

-- Limpieza
DELETE FROM buscontrol.admin_audit_log;
DELETE FROM buscontrol.bus_guardians;

\echo === RESUMEN etapa4_auditoria ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
