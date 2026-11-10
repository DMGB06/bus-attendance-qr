-- =============================================================================
-- 029 - Apoderados y vinculos: lectura y escritura del administrador (web)
-- NO aplicada en produccion. Requiere 025 y 026 (is_web_admin, admin_audit_log).
-- Solo toca el schema buscontrol. No cambia tablas, columnas ni politicas existentes
-- (el movil y el coordinador siguen igual). Solo AGREGA:
--   * 2 politicas SELECT para el administrador
--   * funciones SECURITY DEFINER de escritura (sin INSERT/UPDATE directo)
--
-- Decisiones (docs/web/12):
--   * Desactivar apoderado = is_active=false. El movil le quita acceso a sus hijos
--     (is_guardian_of_student exige is_active). Es el comportamiento buscado.
--   * Desvincular = borrar la fila de bus_student_guardians; queda en admin_audit_log.
--   * Un solo apoderado principal por alumno, impuesto por las funciones (sin indice
--     unico hasta revisar los datos reales).
--   * El web NO crea usuarios de login: auth_user_id queda NULL.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Lectura del administrador
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_read_bus_guardians" ON buscontrol.bus_guardians;
CREATE POLICY "admin_read_bus_guardians" ON buscontrol.bus_guardians
  FOR SELECT TO authenticated
  USING (buscontrol.is_web_admin());

DROP POLICY IF EXISTS "admin_read_bus_student_guardians" ON buscontrol.bus_student_guardians;
CREATE POLICY "admin_read_bus_student_guardians" ON buscontrol.bus_student_guardians
  FOR SELECT TO authenticated
  USING (buscontrol.is_web_admin());

-- -----------------------------------------------------------------------------
-- Interno: exige sesion y rol administrador, devuelve el actor
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol._require_web_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;
  IF NOT buscontrol.is_web_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede gestionar apoderados.';
  END IF;
  RETURN v_user;
END;
$$;

-- -----------------------------------------------------------------------------
-- Interno: valida y normaliza los datos de contacto
--   telefono: solo digitos, sin prefijo 51 si queda de 9 digitos (Peru)
--   dni: 8 digitos o NULL
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol._clean_guardian_fields(
  p_full_name text, p_phone text, p_dni text, p_email text, p_notes text,
  OUT o_name text, OUT o_phone text, OUT o_phone_norm text,
  OUT o_dni text, OUT o_email text, OUT o_notes text)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE d text;
BEGIN
  o_name := NULLIF(trim(COALESCE(p_full_name, '')), '');
  IF o_name IS NULL OR length(o_name) > 150 THEN
    RAISE EXCEPTION 'Nombre obligatorio (máximo 150 caracteres).';
  END IF;

  o_phone := NULLIF(trim(COALESCE(p_phone, '')), '');
  IF o_phone IS NOT NULL THEN
    d := regexp_replace(o_phone, '\D', '', 'g');
    IF length(d) = 11 AND left(d, 2) = '51' THEN d := right(d, 9); END IF;
    IF length(d) <> 9 THEN
      RAISE EXCEPTION 'Teléfono inválido: debe tener 9 dígitos.';
    END IF;
    o_phone_norm := d;
  END IF;

  o_dni := NULLIF(trim(COALESCE(p_dni, '')), '');
  IF o_dni IS NOT NULL AND o_dni !~ '^\d{8}$' THEN
    RAISE EXCEPTION 'DNI inválido: debe tener 8 dígitos.';
  END IF;

  o_email := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  IF o_email IS NOT NULL AND (length(o_email) > 150 OR o_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Correo inválido.';
  END IF;

  o_notes := left(NULLIF(trim(COALESCE(p_notes, '')), ''), 500);
END;
$$;

-- -----------------------------------------------------------------------------
-- Alta de apoderado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.create_guardian(
  p_full_name text, p_phone text DEFAULT NULL, p_dni text DEFAULT NULL,
  p_email text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS buscontrol.bus_guardians
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  c record;
  v_row buscontrol.bus_guardians;
BEGIN
  SELECT * INTO c FROM buscontrol._clean_guardian_fields(p_full_name, p_phone, p_dni, p_email, p_notes);

  INSERT INTO buscontrol.bus_guardians (full_name, phone, phone_normalized, dni, email, notes)
  VALUES (c.o_name, c.o_phone, c.o_phone_norm, c.o_dni, c.o_email, c.o_notes)
  RETURNING * INTO v_row;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_create', 'bus_guardians', v_row.id,
          jsonb_build_object('full_name', v_row.full_name));
  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un apoderado con ese teléfono.';
END;
$$;

-- -----------------------------------------------------------------------------
-- Edicion de datos de contacto (no toca auth_user_id ni is_active)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.update_guardian(
  p_guardian_id uuid, p_full_name text, p_phone text DEFAULT NULL, p_dni text DEFAULT NULL,
  p_email text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS buscontrol.bus_guardians
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  c record;
  v_row buscontrol.bus_guardians;
BEGIN
  SELECT * INTO c FROM buscontrol._clean_guardian_fields(p_full_name, p_phone, p_dni, p_email, p_notes);

  UPDATE buscontrol.bus_guardians
  SET full_name = c.o_name, phone = c.o_phone, phone_normalized = c.o_phone_norm,
      dni = c.o_dni, email = c.o_email, notes = c.o_notes, updated_at = now()
  WHERE id = p_guardian_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apoderado no encontrado.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_update', 'bus_guardians', p_guardian_id, '{}'::jsonb);
  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un apoderado con ese teléfono.';
END;
$$;

-- -----------------------------------------------------------------------------
-- Activar / desactivar (desactivar corta el acceso del apoderado en el movil)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.set_guardian_active(p_guardian_id uuid, p_active boolean)
RETURNS buscontrol.bus_guardians
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  v_row buscontrol.bus_guardians;
BEGIN
  IF p_active IS NULL THEN
    RAISE EXCEPTION 'Indica si se activa o se desactiva.';
  END IF;

  UPDATE buscontrol.bus_guardians
  SET is_active = p_active, updated_at = now()
  WHERE id = p_guardian_id AND is_active IS DISTINCT FROM p_active
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apoderado no encontrado o ya está en ese estado.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user,
          CASE WHEN p_active THEN 'guardian_activate' ELSE 'guardian_deactivate' END,
          'bus_guardians', p_guardian_id, '{}'::jsonb);
  RETURN v_row;
END;
$$;

-- -----------------------------------------------------------------------------
-- Vincular apoderado a alumno (si queda como principal, desmarca a los demas)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.link_guardian(
  p_student_id uuid, p_guardian_id uuid,
  p_relationship text DEFAULT 'apoderado', p_is_primary boolean DEFAULT false)
RETURNS buscontrol.bus_student_guardians
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  v_rel text := left(COALESCE(NULLIF(trim(COALESCE(p_relationship, '')), ''), 'apoderado'), 50);
  v_row buscontrol.bus_student_guardians;
BEGIN
  PERFORM 1 FROM public.social_bus_escolar WHERE id = p_student_id AND activo IS NOT FALSE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alumno no encontrado o inactivo en el padrón.';
  END IF;

  PERFORM 1 FROM buscontrol.bus_guardians WHERE id = p_guardian_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apoderado no encontrado o inactivo.';
  END IF;

  IF COALESCE(p_is_primary, false) THEN
    UPDATE buscontrol.bus_student_guardians SET is_primary = false
    WHERE student_id = p_student_id AND is_primary;
  END IF;

  INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, relationship, is_primary)
  VALUES (p_student_id, p_guardian_id, v_rel, COALESCE(p_is_primary, false))
  RETURNING * INTO v_row;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_link', 'bus_student_guardians', p_guardian_id,
          jsonb_build_object('student_id', p_student_id, 'is_primary', v_row.is_primary));
  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'El apoderado ya está vinculado a ese alumno.';
END;
$$;

-- -----------------------------------------------------------------------------
-- Marcar apoderado principal (debe estar ya vinculado)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.set_primary_guardian(p_student_id uuid, p_guardian_id uuid)
RETURNS buscontrol.bus_student_guardians
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  v_row buscontrol.bus_student_guardians;
BEGIN
  PERFORM 1 FROM buscontrol.bus_student_guardians
  WHERE student_id = p_student_id AND guardian_id = p_guardian_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El apoderado no está vinculado a ese alumno.';
  END IF;

  UPDATE buscontrol.bus_student_guardians SET is_primary = false
  WHERE student_id = p_student_id AND guardian_id <> p_guardian_id AND is_primary;

  UPDATE buscontrol.bus_student_guardians SET is_primary = true
  WHERE student_id = p_student_id AND guardian_id = p_guardian_id
  RETURNING * INTO v_row;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_set_primary', 'bus_student_guardians', p_guardian_id,
          jsonb_build_object('student_id', p_student_id));
  RETURN v_row;
END;
$$;

-- -----------------------------------------------------------------------------
-- Desvincular (borra la fila; el historial queda en admin_audit_log)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.unlink_guardian(p_student_id uuid, p_guardian_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  v_was_primary boolean;
BEGIN
  DELETE FROM buscontrol.bus_student_guardians
  WHERE student_id = p_student_id AND guardian_id = p_guardian_id
  RETURNING is_primary INTO v_was_primary;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El apoderado no está vinculado a ese alumno.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'guardian_unlink', 'bus_student_guardians', p_guardian_id,
          jsonb_build_object('student_id', p_student_id, 'was_primary', v_was_primary));
END;
$$;

-- -----------------------------------------------------------------------------
-- Permisos: solo authenticated; los helpers internos no se exponen
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION buscontrol._require_web_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION buscontrol._clean_guardian_fields(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION buscontrol.create_guardian(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.update_guardian(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.set_guardian_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.link_guardian(uuid, uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.set_primary_guardian(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.unlink_guardian(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION buscontrol.create_guardian(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.update_guardian(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.set_guardian_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.link_guardian(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.set_primary_guardian(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.unlink_guardian(uuid, uuid) TO authenticated;

COMMIT;
