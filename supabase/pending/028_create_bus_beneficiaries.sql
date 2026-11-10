-- =============================================================================
-- 028 - Beneficiarios del servicio de transporte (alta / baja logica)
-- NO aplicada en produccion. Requiere 025 y 026 (usa is_web_admin() y admin_audit_log).
-- Solo toca el schema buscontrol. No modifica public.social_bus_escolar.
--
-- Decisiones (docs/web/12, decision 4):
--   * Baja logica reversible: is_active + deactivated_*. Nunca se borra al alumno.
--   * La llave es student_id (id del padron), no el codigo: el codigo puede ser
--     NULL o cambiar. El web muestra y busca siempre por codigo.
--   * La baja NO cierra el carnet vigente y NO cambia el movil (el movil solo
--     consulta el padron).
--   * Sin INSERT/UPDATE/DELETE directo: solo RPC SECURITY DEFINER, con auth.uid().
--   * Historial de altas/bajas/reactivaciones en admin_audit_log.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS buscontrol.bus_beneficiaries (
  student_id uuid PRIMARY KEY REFERENCES public.social_bus_escolar (id),
  is_active boolean NOT NULL DEFAULT true,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  enrolled_by uuid NOT NULL REFERENCES auth.users (id),
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES auth.users (id),
  deactivated_reason text,
  CONSTRAINT bus_beneficiaries_reason_len
    CHECK (deactivated_reason IS NULL OR length(deactivated_reason) <= 200),
  CONSTRAINT bus_beneficiaries_state_check CHECK (
    (is_active
       AND deactivated_at IS NULL
       AND deactivated_by IS NULL
       AND deactivated_reason IS NULL)
    OR
    (NOT is_active
       AND deactivated_at IS NOT NULL
       AND deactivated_by IS NOT NULL
       AND length(trim(deactivated_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_bus_beneficiaries_active
  ON buscontrol.bus_beneficiaries (is_active);

ALTER TABLE buscontrol.bus_beneficiaries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON buscontrol.bus_beneficiaries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON buscontrol.bus_beneficiaries TO authenticated;

DROP POLICY IF EXISTS "admin_read_beneficiaries" ON buscontrol.bus_beneficiaries;
CREATE POLICY "admin_read_beneficiaries" ON buscontrol.bus_beneficiaries
  FOR SELECT TO authenticated
  USING (buscontrol.is_web_admin());

-- -----------------------------------------------------------------------------
-- RPC: dar de alta (o reactivar) a un alumno como beneficiario
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.enroll_beneficiary(p_student_id uuid)
RETURNS buscontrol.bus_beneficiaries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prev boolean;
  v_found boolean;
  v_row buscontrol.bus_beneficiaries;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  IF NOT buscontrol.is_web_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede gestionar beneficiarios.';
  END IF;

  PERFORM 1
  FROM public.social_bus_escolar s
  WHERE s.id = p_student_id
    AND s.activo IS NOT FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alumno no encontrado o inactivo en el padrón.';
  END IF;

  SELECT b.is_active, true
  INTO v_prev, v_found
  FROM buscontrol.bus_beneficiaries b
  WHERE b.student_id = p_student_id
  FOR UPDATE;

  IF NOT COALESCE(v_found, false) THEN
    INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by)
    VALUES (p_student_id, v_user)
    RETURNING * INTO v_row;

    INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
    VALUES (v_user, 'beneficiary_enroll', 'bus_beneficiaries', p_student_id,
            jsonb_build_object('student_id', p_student_id));
  ELSIF v_prev THEN
    RAISE EXCEPTION 'El alumno ya es beneficiario activo.';
  ELSE
    UPDATE buscontrol.bus_beneficiaries
    SET is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL,
        deactivated_reason = NULL
    WHERE student_id = p_student_id
    RETURNING * INTO v_row;

    INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
    VALUES (v_user, 'beneficiary_reactivate', 'bus_beneficiaries', p_student_id,
            jsonb_build_object('student_id', p_student_id));
  END IF;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'El alumno ya fue dado de alta. Intenta de nuevo.';
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: dar de baja (logica) a un beneficiario; el motivo es obligatorio
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.deactivate_beneficiary(
  p_student_id uuid,
  p_reason text
)
RETURNS buscontrol.bus_beneficiaries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_reason text := left(NULLIF(trim(COALESCE(p_reason, '')), ''), 200);
  v_row buscontrol.bus_beneficiaries;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  IF NOT buscontrol.is_web_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede gestionar beneficiarios.';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Debes indicar un motivo.';
  END IF;

  UPDATE buscontrol.bus_beneficiaries
  SET is_active = false,
      deactivated_at = now(),
      deactivated_by = v_user,
      deactivated_reason = v_reason
  WHERE student_id = p_student_id
    AND is_active
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El alumno no es un beneficiario activo.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'beneficiary_deactivate', 'bus_beneficiaries', p_student_id,
          jsonb_build_object('student_id', p_student_id, 'reason', v_reason));

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.enroll_beneficiary(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.deactivate_beneficiary(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.enroll_beneficiary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.deactivate_beneficiary(uuid, text) TO authenticated;

COMMIT;
