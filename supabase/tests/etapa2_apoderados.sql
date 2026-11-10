-- Pruebas 029 (apoderados, PASS/FALLA). Requiere etapa1_roles.sql (usuarios y alumnos) y aplicadas 025, 026, 029 y 030.
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

DELETE FROM buscontrol.bus_student_guardians;
DELETE FROM buscontrol.bus_guardians;
DELETE FROM buscontrol.admin_audit_log WHERE entity IN ('bus_guardians','bus_student_guardians');

-- ADMIN: alta y validaciones
SELECT pg_temp.chk('etapa2_apoderados','alta G1 con datos sucios', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('Ana Perez','+51 987-654-321','12345678','ANA@Mail.com','nota')$$), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','G1 normalizado (telefono y correo)', (SELECT phone_normalized||';'||email FROM buscontrol.bus_guardians WHERE full_name='Ana Perez'), '987654321;ana@mail.com');
SELECT pg_temp.chk('etapa2_apoderados','telefono repetido (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('Otra','987654321')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','sin nombre (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('   ')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','dni invalido (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('X','','123')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','telefono invalido (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('X','12345')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','correo invalido (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('X',NULL,NULL,'nope')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','alta G2 sin telefono', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('Luis Ruiz')$$), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','alta G3 sin telefono', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.create_guardian('Rosa Diaz')$$), 'OK');

SELECT id AS g1 FROM buscontrol.bus_guardians WHERE full_name='Ana Perez' \gset
SELECT id AS g2 FROM buscontrol.bus_guardians WHERE full_name='Luis Ruiz' \gset
SELECT id AS g3 FROM buscontrol.bus_guardians WHERE full_name='Rosa Diaz' \gset

-- EDITAR
SELECT pg_temp.chk('etapa2_apoderados','editar G1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.update_guardian(%L,'Ana P. Perez','999111222')$$, :'g1')), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','G1 editado y sin auth_user_id', (SELECT full_name||';'||phone_normalized||';'||coalesce(auth_user_id::text,'null') FROM buscontrol.bus_guardians WHERE id=:'g1'), 'Ana P. Perez;999111222;null');
SELECT pg_temp.chk('etapa2_apoderados','editar con telefono de otro (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.update_guardian(%L,'Luis','999111222')$$, :'g2')), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','editar inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol.update_guardian(gen_random_uuid(),'X')$$), 'ERR');

-- VINCULAR / PRINCIPAL
SELECT pg_temp.chk('etapa2_apoderados','vincular G1 a S1 como principal', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian(%L,%L,'madre',true)$$, :'S1', :'g1')), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','vincular G1 a S1 otra vez (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian(%L,%L)$$, :'S1', :'g1')), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','vincular G2 a S1 como principal', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian(%L,%L,'padre',true)$$, :'S1', :'g2')), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','S1 tiene 1 principal tras vincular G2', (SELECT count(*)::text FROM buscontrol.bus_student_guardians WHERE student_id=:'S1' AND is_primary), '1');
SELECT pg_temp.chk('etapa2_apoderados','set principal G1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.set_primary_guardian(%L,%L)$$, :'S1', :'g1')), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','G1 es el principal de S1', (SELECT is_primary::text FROM buscontrol.bus_student_guardians WHERE student_id=:'S1' AND guardian_id=:'g1'), 'true');
SELECT pg_temp.chk('etapa2_apoderados','S1 sigue con 1 principal', (SELECT count(*)::text FROM buscontrol.bus_student_guardians WHERE student_id=:'S1' AND is_primary), '1');
SELECT pg_temp.chk('etapa2_apoderados','set principal de apoderado no vinculado (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.set_primary_guardian(%L,%L)$$, :'S1', :'g3')), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','vincular a alumno inexistente (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian(gen_random_uuid(),%L)$$, :'g1')), 'ERR');

-- DESACTIVAR
SELECT pg_temp.chk('etapa2_apoderados','desactivar G3', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.set_guardian_active(%L,false)$$, :'g3')), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','desactivar G3 otra vez (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.set_guardian_active(%L,false)$$, :'g3')), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','vincular apoderado inactivo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.link_guardian(%L,%L)$$, :'S2', :'g3')), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','reactivar G3', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.set_guardian_active(%L,true)$$, :'g3')), 'OK');

-- DESVINCULAR
SELECT pg_temp.chk('etapa2_apoderados','desvincular G2 de S1', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.unlink_guardian(%L,%L)$$, :'S1', :'g2')), 'OK');
SELECT pg_temp.chk('etapa2_apoderados','desvincular otra vez (bloqueado)', pg_temp.as_user(:'ADM','authenticated',format($$SELECT buscontrol.unlink_guardian(%L,%L)$$, :'S1', :'g2')), 'ERR');

-- LECTURA Y ESCRITURA DIRECTA DEL ADMIN
SELECT pg_temp.chk('etapa2_apoderados','admin lee bus_guardians', pg_temp.cnt(:'ADM','authenticated','buscontrol.bus_guardians'), '3');
SELECT pg_temp.chk('etapa2_apoderados','admin lee bus_student_guardians', pg_temp.cnt(:'ADM','authenticated','buscontrol.bus_student_guardians'), '1');
SELECT pg_temp.chk('etapa2_apoderados','admin INSERT directo (bloqueado)', pg_temp.as_user(:'ADM','authenticated',$$INSERT INTO buscontrol.bus_guardians(full_name) VALUES ('hack')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','admin UPDATE directo (sin efecto o sin permiso desde la 040)', pg_temp.as_user(:'ADM','authenticated',$$UPDATE buscontrol.bus_guardians SET is_active=false$$), 'OK rows=0|ERR');
SELECT pg_temp.chk('etapa2_apoderados','admin DELETE directo (sin efecto o sin permiso desde la 040)', pg_temp.as_user(:'ADM','authenticated',$$DELETE FROM buscontrol.bus_student_guardians$$), 'OK rows=0|ERR');

-- OTROS ROLES
DO $o$
DECLARE
  r record;
  g1 uuid := (SELECT id FROM buscontrol.bus_guardians WHERE full_name='Ana P. Perez');
BEGIN
  FOR r IN SELECT * FROM (VALUES ('chofer','b0000000-0000-0000-0000-000000000002'),('asistenta','b0000000-0000-0000-0000-000000000003'),
                                  ('padre','b0000000-0000-0000-0000-000000000004'),('coordinador','b0000000-0000-0000-0000-000000000005')) v(n,id)
  LOOP
    PERFORM pg_temp.chk('etapa2_apoderados', 'rol '||r.n||': crear apoderado', pg_temp.as_user(r.id,'authenticated',$s$SELECT buscontrol.create_guardian('Intruso')$s$), 'ERR');
    PERFORM pg_temp.chk('etapa2_apoderados', 'rol '||r.n||': desactivar apoderado', pg_temp.as_user(r.id,'authenticated',format($s$SELECT buscontrol.set_guardian_active(%L,false)$s$, g1)), 'ERR');
    PERFORM pg_temp.chk('etapa2_apoderados', 'rol '||r.n||': desvincular', pg_temp.as_user(r.id,'authenticated',format($s$SELECT buscontrol.unlink_guardian(%L,%L)$s$, 'a0000000-0000-0000-0000-000000000001', g1)), 'ERR');
  END LOOP;
END $o$;

-- ANON
SELECT pg_temp.chk('etapa2_apoderados','anon crear apoderado', pg_temp.as_user(NULL,'anon',$$SELECT buscontrol.create_guardian('Intruso')$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','anon lee bus_guardians', pg_temp.cnt(NULL,'anon','buscontrol.bus_guardians'), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','anon ejecuta helper interno', pg_temp.as_user(NULL,'anon',$$SELECT buscontrol._require_web_admin()$$), 'ERR');
SELECT pg_temp.chk('etapa2_apoderados','admin ejecuta helper interno (no expuesto)', pg_temp.as_user(:'ADM','authenticated',$$SELECT buscontrol._require_web_admin()$$), 'ERR');

-- AUDITORIA
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_create', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_create'), '3');
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_update', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_update'), '1');
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_link', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_link'), '2');
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_set_primary', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_set_primary'), '1');
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_deactivate', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_deactivate'), '1');
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_activate', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_activate'), '1');
SELECT pg_temp.chk('etapa2_apoderados','auditoria guardian_unlink', (SELECT count(*)::text FROM buscontrol.admin_audit_log WHERE action='guardian_unlink'), '1');

\echo === RESUMEN etapa2_apoderados ===
SELECT suite, count(*) AS total, count(*) FILTER (WHERE ok) AS pasan, count(*) FILTER (WHERE NOT ok) AS fallan FROM res GROUP BY suite;
SELECT label, esp, obt FROM res WHERE NOT ok ORDER BY n;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM res WHERE NOT ok) THEN RAISE EXCEPTION 'HAY PRUEBAS FALLIDAS'; END IF; END $$;
