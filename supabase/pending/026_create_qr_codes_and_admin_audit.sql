-- =============================================================================
-- 026 - Registro de carnets QR (qr_codes) + auditoria del administrador web
-- NO aplicada. Requiere 025 ya ejecutada y confirmada.
-- Solo toca el schema buscontrol.
--
-- Decision de diseno (docs/web/11): el valor impreso en el QR es SIEMPRE el
-- campo `codigo` del padron (public.social_bus_escolar), que es lo que escanea
-- el movil. qr_codes NO genera codigos nuevos: registra emisiones, reimpresiones
-- y reportes de perdida. El movil no consulta esta tabla.
--
-- Seguridad:
--   * Sin INSERT/UPDATE/DELETE directo: solo RPC SECURITY DEFINER.
--   * issued_by se deriva de auth.uid(), nunca llega del cliente.
--   * Lectura solo para administrador.
--   * anon y authenticated sin privilegios de escritura sobre las tablas.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper: es administrador web activo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.is_web_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
  SELECT COALESCE(buscontrol.current_app_role() = 'administrador', false)
$$;

REVOKE ALL ON FUNCTION buscontrol.is_web_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.is_web_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- Tabla qr_codes (historial de emisiones de carnet)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buscontrol.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.social_bus_escolar (id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'vigente',
  reason text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL REFERENCES auth.users (id),
  closed_at timestamptz,
  CONSTRAINT qr_codes_status_check
    CHECK (status IN ('vigente', 'reemplazado', 'reportado_perdido')),
  CONSTRAINT qr_codes_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT qr_codes_reason_len CHECK (reason IS NULL OR length(reason) <= 200)
);

-- Un solo carnet vigente por alumno (tambien protege ante concurrencia).
CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_codes_one_vigente_per_student
  ON buscontrol.qr_codes (student_id)
  WHERE status = 'vigente';

CREATE INDEX IF NOT EXISTS idx_qr_codes_student_id
  ON buscontrol.qr_codes (student_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code
  ON buscontrol.qr_codes (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status
  ON buscontrol.qr_codes (status);

-- -----------------------------------------------------------------------------
-- Tabla admin_audit_log (auditoria propia del web)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buscontrol.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users (id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON buscontrol.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity
  ON buscontrol.admin_audit_log (entity, entity_id);

-- -----------------------------------------------------------------------------
-- RLS y privilegios: lectura solo admin; escritura solo via RPC
-- -----------------------------------------------------------------------------
ALTER TABLE buscontrol.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.admin_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON buscontrol.qr_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON buscontrol.admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON buscontrol.qr_codes TO authenticated;
GRANT SELECT ON buscontrol.admin_audit_log TO authenticated;

DROP POLICY IF EXISTS "admin_read_qr_codes" ON buscontrol.qr_codes;
CREATE POLICY "admin_read_qr_codes" ON buscontrol.qr_codes
  FOR SELECT TO authenticated
  USING (buscontrol.is_web_admin());

DROP POLICY IF EXISTS "admin_read_audit_log" ON buscontrol.admin_audit_log;
CREATE POLICY "admin_read_audit_log" ON buscontrol.admin_audit_log
  FOR SELECT TO authenticated
  USING (buscontrol.is_web_admin());

-- -----------------------------------------------------------------------------
-- RPC: emitir (o reemitir) el carnet de un alumno
-- Cierra el carnet vigente anterior (si existe) y registra uno nuevo con el
-- codigo actual del padron. No inventa codigos.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.issue_qr_card(
  p_student_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS buscontrol.qr_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
  v_reason text := left(NULLIF(trim(COALESCE(p_reason, '')), ''), 200);
  v_row buscontrol.qr_codes;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  IF NOT buscontrol.is_web_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede emitir carnets.';
  END IF;

  SELECT upper(trim(s.codigo))
  INTO v_code
  FROM public.social_bus_escolar s
  WHERE s.id = p_student_id
    AND s.activo IS NOT FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alumno no encontrado o inactivo en el padrón.';
  END IF;

  IF v_code IS NULL OR v_code = '' THEN
    RAISE EXCEPTION 'El alumno no tiene código asignado en el padrón.';
  END IF;

  UPDATE buscontrol.qr_codes
  SET status = 'reemplazado', closed_at = now()
  WHERE student_id = p_student_id
    AND status = 'vigente';

  INSERT INTO buscontrol.qr_codes (student_id, code, status, reason, issued_by)
  VALUES (p_student_id, v_code, 'vigente', v_reason, v_user)
  RETURNING * INTO v_row;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (
    v_user,
    'qr_issue',
    'qr_codes',
    v_row.id,
    jsonb_build_object('student_id', p_student_id, 'code', v_code, 'reason', v_reason)
  );

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un carnet vigente para este alumno. Intenta de nuevo.';
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: reportar carnet perdido (queda sin vigente hasta reemitir)
-- Nota: el movil NO consulta esta tabla; el reporte es informativo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscontrol.report_qr_lost(
  p_student_id uuid,
  p_reason text
)
RETURNS buscontrol.qr_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_reason text := left(NULLIF(trim(COALESCE(p_reason, '')), ''), 200);
  v_row buscontrol.qr_codes;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  IF NOT buscontrol.is_web_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede reportar carnets.';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Debes indicar un motivo.';
  END IF;

  UPDATE buscontrol.qr_codes
  SET status = 'reportado_perdido', closed_at = now(), reason = v_reason
  WHERE student_id = p_student_id
    AND status = 'vigente'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El alumno no tiene un carnet vigente.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (
    v_user,
    'qr_report_lost',
    'qr_codes',
    v_row.id,
    jsonb_build_object('student_id', p_student_id, 'code', v_row.code, 'reason', v_reason)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.issue_qr_card(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.report_qr_lost(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.issue_qr_card(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.report_qr_lost(uuid, text) TO authenticated;

COMMIT;
