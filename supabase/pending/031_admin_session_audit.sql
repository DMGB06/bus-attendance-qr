-- =============================================================================
-- 031 - Registro de inicio y cierre de sesion del administrador (web)
-- NO aplicada en produccion. Requiere 026 (admin_audit_log) y 029 (_require_web_admin).
-- Solo AGREGA una funcion. Los intentos fallidos quedan en los logs de Supabase Auth
-- (no hay usuario autenticado que los firme).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.log_admin_session(
  p_action text, p_ip text, p_user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE v_user uuid := buscontrol._require_web_admin();
BEGIN
  IF p_action NOT IN ('login', 'logout') THEN
    RAISE EXCEPTION 'Acción inválida.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'session_' || p_action, 'auth_session', v_user,
          jsonb_build_object(
            'ip', left(COALESCE(p_ip, ''), 64),
            'user_agent', left(COALESCE(p_user_agent, ''), 300),
            'aal', auth.jwt() ->> 'aal'));
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.log_admin_session(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.log_admin_session(text, text, text) TO authenticated;

COMMIT;
