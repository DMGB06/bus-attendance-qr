-- =============================================================================
-- Fase A — Endurecimiento RLS crítico (012)
-- Pre-requisito: todos los usuarios Auth tienen app_role asignado.
-- Ejecutar COMPLETO en Supabase SQL Editor (funciones primero, políticas después).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1 — Funciones y trigger (EJECUTAR PRIMERO si falló is_active_operator)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscontrol.current_app_role()
RETURNS buscontrol.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT app_role
  FROM buscontrol.app_profiles
  WHERE id = auth.uid()
    AND is_active = true
$$;

CREATE OR REPLACE FUNCTION buscontrol.is_active_operator()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
$$;

CREATE OR REPLACE FUNCTION buscontrol.protect_app_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
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

DROP TRIGGER IF EXISTS trg_protect_app_profile ON buscontrol.app_profiles;
CREATE TRIGGER trg_protect_app_profile
  BEFORE UPDATE ON buscontrol.app_profiles
  FOR EACH ROW
  EXECUTE FUNCTION buscontrol.protect_app_profile_sensitive_columns();

CREATE OR REPLACE FUNCTION buscontrol.update_own_profile(
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS buscontrol.app_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile buscontrol.app_profiles;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  UPDATE buscontrol.app_profiles
  SET
    full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
    phone = COALESCE(NULLIF(trim(p_phone), ''), phone),
    updated_at = now()
  WHERE id = v_user
    AND is_active = true
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado o cuenta inactiva.';
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.update_own_profile(text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- PARTE 2 — Perfil: quitar UPDATE directo
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "update_own_app_profile" ON buscontrol.app_profiles;
DROP POLICY IF EXISTS "insert_app_profile" ON buscontrol.app_profiles;

-- -----------------------------------------------------------------------------
-- PARTE 3 — Eliminar políticas MVP permisivas (004) si aún existen
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "ops_all_bus_trips" ON buscontrol.bus_trips;
DROP POLICY IF EXISTS "ops_all_attendance" ON buscontrol.bus_attendance_records;
DROP POLICY IF EXISTS "allow all authenticated" ON buscontrol.bus_trips;
DROP POLICY IF EXISTS "allow all authenticated" ON buscontrol.bus_attendance_records;

-- -----------------------------------------------------------------------------
-- PARTE 4 — Políticas operativas con is_active_operator()
-- (requiere PARTE 1 ejecutada antes)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "ops_manage_bus_trips" ON buscontrol.bus_trips;
CREATE POLICY "ops_manage_bus_trips" ON buscontrol.bus_trips
  FOR ALL TO authenticated
  USING (buscontrol.is_active_operator())
  WITH CHECK (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_manage_attendance" ON buscontrol.bus_attendance_records;
CREATE POLICY "ops_manage_attendance" ON buscontrol.bus_attendance_records
  FOR ALL TO authenticated
  USING (buscontrol.is_active_operator())
  WITH CHECK (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_read_student_guardians" ON buscontrol.student_guardians;
CREATE POLICY "ops_read_student_guardians" ON buscontrol.student_guardians
  FOR SELECT TO authenticated
  USING (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_read_student_trip_status" ON buscontrol.student_trip_status;
CREATE POLICY "ops_read_student_trip_status" ON buscontrol.student_trip_status
  FOR SELECT TO authenticated
  USING (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_read_bus_guardians" ON buscontrol.bus_guardians;
CREATE POLICY "ops_read_bus_guardians" ON buscontrol.bus_guardians
  FOR SELECT TO authenticated
  USING (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_read_bus_student_guardians" ON buscontrol.bus_student_guardians;
CREATE POLICY "ops_read_bus_student_guardians" ON buscontrol.bus_student_guardians
  FOR SELECT TO authenticated
  USING (buscontrol.is_active_operator());

DROP POLICY IF EXISTS "ops_manage_trip_locations" ON buscontrol.bus_trip_locations;
CREATE POLICY "ops_manage_trip_locations" ON buscontrol.bus_trip_locations
  FOR ALL TO authenticated
  USING (buscontrol.is_active_operator())
  WITH CHECK (buscontrol.is_active_operator());

-- -----------------------------------------------------------------------------
-- PARTE 5 — Revocar SELECT anon en schema operativo
-- -----------------------------------------------------------------------------

REVOKE SELECT ON ALL TABLES IN SCHEMA buscontrol FROM anon;
