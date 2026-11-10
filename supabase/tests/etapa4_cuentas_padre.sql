-- Pruebas 032 (cuentas de padre, PASS/FALLA). Requiere etapa1_roles.sql y aplicadas 025, 026, 029, 030 y 032.
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
\set CHO 'b0000000-0000-0000-0000-000000000002'
\set PAD 'b0000000-0000-0000-0000-000000000004'

DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.admin_audit_log WHERE action IN ('guardian_account_link','guardian_account_unlink');

SELECT pg_temp.chk('etapa4_cuentas','alta G1', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('Ana Perez','987654321')$$), 'OK');
SELECT pg_temp.chk('etapa4_cuentas','alta G2', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('Luis Ruiz','912345678')$$), 'OK');
SELECT id AS g1 FROM buscontrol.bus_guardians WHERE full_name='Ana Perez' \gset
SELECT id AS g2 FROM buscontrol.bus_guardians WHERE full_name='Luis Ruiz' \gset

-- No administrador y sin sesion: bloqueados
SELECT pg_temp.chk('etapa4_cuentas','padre no vincula', pg_temp.as_user(:'PAD','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g1',:'PAD')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','chofer no vincula', pg_temp.as_user(:'CHO','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g1',:'PAD')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','anon no vincula', pg_temp.as_user(NULL,'anon',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g1',:'PAD')), 'ERR');

-- Administrador: vincular
SELECT pg_temp.chk('etapa4_cuentas','admin vincula G1 con la cuenta del padre', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g1',:'PAD')), 'OK');
SELECT pg_temp.chk('etapa4_cuentas','auth_user_id guardado', (SELECT auth_user_id::text FROM buscontrol.bus_guardians WHERE id=:'g1'), :'PAD');
SELECT pg_temp.chk('etapa4_cuentas','G1 ya tiene cuenta (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g1',:'CHO')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','la cuenta ya es de otro apoderado (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g2',:'PAD')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','usuario inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,'c0000000-0000-0000-0000-00000000dead')$$,:'g2')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','apoderado inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian_account('c0000000-0000-0000-0000-00000000dead',%L)$$,:'CHO')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','auditoria link', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_account_link' AND entity_id=:'g1'), '1');

-- Desvincular
SELECT pg_temp.chk('etapa4_cuentas','padre no desvincula', pg_temp.as_user(:'PAD','authenticated',format($$SELECT buscontrol.unlink_guardian_account(%L)$$,:'g1')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','G2 sin cuenta no se desvincula', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.unlink_guardian_account(%L)$$,:'g2')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','admin desvincula G1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.unlink_guardian_account(%L)$$,:'g1')), 'OK');
SELECT pg_temp.chk('etapa4_cuentas','auth_user_id queda NULL', (SELECT coalesce(auth_user_id::text,'NULL') FROM buscontrol.bus_guardians WHERE id=:'g1'), 'NULL');
SELECT pg_temp.chk('etapa4_cuentas','auditoria unlink', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_account_unlink' AND entity_id=:'g1'), '1');
SELECT pg_temp.chk('etapa4_cuentas','la cuenta liberada se puede usar en G2', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian_account(%L,%L)$$,:'g2',:'PAD')), 'OK');

-- Auditoria de acciones de cuenta hechas por la Edge Function
SELECT pg_temp.chk('etapa4_cuentas','padre no audita', pg_temp.as_user(:'PAD','authenticated',format($$SELECT buscontrol.log_guardian_account_action(%L,'guardian_account_deactivate')$$,:'g2')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','anon no audita', pg_temp.as_user(NULL,'anon',format($$SELECT buscontrol.log_guardian_account_action(%L,'guardian_account_deactivate')$$,:'g2')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','accion invalida (bloqueada)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.log_guardian_account_action(%L,'borrar_todo')$$,:'g2')), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','apoderado inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.log_guardian_account_action('c0000000-0000-0000-0000-00000000dead','guardian_account_deactivate')$$), 'ERR');
SELECT pg_temp.chk('etapa4_cuentas','admin audita reset_password', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.log_guardian_account_action(%L,'guardian_account_reset_password')$$,:'g2')), 'OK');
SELECT pg_temp.chk('etapa4_cuentas','auditoria reset_password', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_account_reset_password' AND entity_id=:'g2'), '1');

-- Trigger de proteccion de app_profiles: service_role puede, el usuario normal no
SELECT pg_temp.chk('etapa4_cuentas','service_role cambia is_active', pg_temp.as_user(NULL,'service_role',format($$UPDATE buscontrol.app_profiles SET is_active=false WHERE id=%L$$,:'PAD')), 'OK rows=1');
SELECT pg_temp.chk('etapa4_cuentas','service_role cambia app_role', pg_temp.as_user(NULL,'service_role',format($$UPDATE buscontrol.app_profiles SET app_role='padre' WHERE id=%L$$,:'PAD')), 'OK rows=1');
SELECT pg_temp.chk('etapa4_cuentas','el padre no se cambia el rol', pg_temp.as_user(:'PAD','authenticated',format($$UPDATE buscontrol.app_profiles SET app_role='administrador' WHERE id=%L$$,:'PAD')), 'ERR|OK rows=0');
SELECT pg_temp.chk('etapa4_cuentas','el rol del padre no cambio', (SELECT app_role::text FROM buscontrol.app_profiles WHERE id=:'PAD'), 'padre');
SELECT pg_temp.chk('etapa4_cuentas','el padre no se reactiva solo', pg_temp.as_user(:'PAD','authenticated',format($$UPDATE buscontrol.app_profiles SET is_active=true WHERE id=%L$$,:'PAD')), 'ERR|OK rows=0');
SELECT pg_temp.chk('etapa4_cuentas','el padre sigue desactivado hasta que service_role lo cambie', (SELECT is_active::text FROM buscontrol.app_profiles WHERE id=:'PAD'), 'false');
SELECT pg_temp.chk('etapa4_cuentas','service_role reactiva al padre', pg_temp.as_user(NULL,'service_role',format($$UPDATE buscontrol.app_profiles SET is_active=true WHERE id=%L$$,:'PAD')), 'OK rows=1');

\echo === RESUMEN etapa4_cuentas ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
