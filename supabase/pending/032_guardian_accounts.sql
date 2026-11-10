-- =============================================================================
-- 032 - Cuenta de login del apoderado: vincular y desvincular (web)
-- NO aplicada en produccion. Requiere 026 (admin_audit_log) y 029 (_require_web_admin).
-- AGREGA 3 funciones y CORRIGE 1 existente (protect_app_profile_sensitive_columns, ver abajo).
--
-- La cuenta de Auth (auth.users) la crea la Edge Function guardian-account con service_role.
-- Estas funciones solo ligan o sueltan esa cuenta en bus_guardians.auth_user_id, con la
-- sesion del administrador, y dejan auditoria. NO tocan app_profiles: el trigger
-- protect_app_profile_sensitive_columns solo permite cambiar app_role e is_active con
-- service_role, asi que el rol "padre" y el estado activo los fija la Edge Function.
-- log_guardian_account_action deja la auditoria de las acciones que la Edge Function hace con
-- service_role (reiniciar clave, desactivar, reactivar); crear ya queda en guardian_account_link.
-- Correccion: el trigger protect_app_profile_sensitive_columns solo reconocia a service_role por
-- la variable request.jwt.claim.role, que PostgREST ya no envia (manda el JSON request.jwt.claims).
-- Resultado: ni siquiera service_role podia cambiar app_role o is_active. Ahora lee las dos.
-- Un usuario normal sigue sin poder cambiar su rol ni su estado.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.protect_app_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.app_role IS DISTINCT FROM OLD.app_role THEN
    RAISE EXCEPTION 'No puedes modificar tu rol de aplicación.';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'No puedes modificar el estado activo de tu cuenta.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.link_guardian_account(p_guardian_id uuid, p_auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE v_user uuid := buscontrol._require_web_admin();
BEGIN
  IF p_guardian_id IS NULL OR p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Faltan datos.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'La cuenta no existe.';
  END IF;

  BEGIN
    UPDATE buscontrol.bus_guardians
    SET auth_user_id = p_auth_user_id, updated_at = now()
    WHERE id = p_guardian_id AND auth_user_id IS NULL;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Esa cuenta ya pertenece a otro apoderado.';
  END;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apoderado no encontrado o ya tiene cuenta.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_account_link', 'bus_guardians', p_guardian_id,
          jsonb_build_object('auth_user_id', p_auth_user_id));
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.unlink_guardian_account(p_guardian_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  v_old uuid;
BEGIN
  UPDATE buscontrol.bus_guardians g
  SET auth_user_id = NULL, updated_at = now()
  FROM (SELECT id, auth_user_id FROM buscontrol.bus_guardians WHERE id = p_guardian_id FOR UPDATE) o
  WHERE g.id = o.id AND o.auth_user_id IS NOT NULL
  RETURNING o.auth_user_id INTO v_old;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apoderado no encontrado o no tiene cuenta.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_account_unlink', 'bus_guardians', p_guardian_id,
          jsonb_build_object('auth_user_id', v_old));
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.log_guardian_account_action(p_guardian_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE v_user uuid := buscontrol._require_web_admin();
BEGIN
  IF p_action NOT IN ('guardian_account_reset_password', 'guardian_account_deactivate', 'guardian_account_reactivate') THEN
    RAISE EXCEPTION 'Acción inválida.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM buscontrol.bus_guardians WHERE id = p_guardian_id) THEN
    RAISE EXCEPTION 'Apoderado no encontrado.';
  END IF;
  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, p_action, 'bus_guardians', p_guardian_id, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.link_guardian_account(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.unlink_guardian_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.link_guardian_account(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.unlink_guardian_account(uuid) TO authenticated;
REVOKE ALL ON FUNCTION buscontrol.log_guardian_account_action(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.log_guardian_account_action(uuid, text) TO authenticated;

COMMIT;
