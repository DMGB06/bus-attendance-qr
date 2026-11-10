-- Rollback de 032: quita las tres funciones y restaura el trigger original. No toca datos: las cuentas ya ligadas en
-- bus_guardians.auth_user_id y las filas de admin_audit_log se conservan.
BEGIN;
DROP FUNCTION IF EXISTS buscontrol.link_guardian_account(uuid, uuid);
DROP FUNCTION IF EXISTS buscontrol.unlink_guardian_account(uuid);
DROP FUNCTION IF EXISTS buscontrol.log_guardian_account_action(uuid, text);

-- Restaura el trigger original (0001)
CREATE OR REPLACE FUNCTION buscontrol.protect_app_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
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

COMMIT;
