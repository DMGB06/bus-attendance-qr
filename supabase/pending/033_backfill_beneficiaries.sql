-- =============================================================================
-- 033 (carga inicial) - Da de alta como beneficiarios a todos los alumnos activos del padron
-- Correr ANTES de 033_hide_non_beneficiaries.sql. Es DML (solo datos) e idempotente: no toca a
-- quien ya tiene fila (no reactiva a los dados de baja). El actor es el primer administrador.
-- Verificar al terminar: el conteo "faltan" debe ser 0.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_admin uuid;
  v_n bigint;
BEGIN
  SELECT id INTO v_admin FROM buscontrol.app_profiles
  WHERE app_role = 'administrador' AND is_active ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay un administrador activo: crear el administrador antes de la carga inicial.';
  END IF;

  INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by)
  SELECT s.id, v_admin
  FROM public.social_bus_escolar s
  WHERE COALESCE(s.activo, true) = true
  ON CONFLICT (student_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_admin, 'beneficiary_backfill', 'bus_beneficiaries', NULL, jsonb_build_object('inserted', v_n));
END $$;

-- Verificacion: alumnos activos del padron sin fila en bus_beneficiaries (debe ser 0)
SELECT count(*) AS faltan
FROM public.social_bus_escolar s
WHERE COALESCE(s.activo, true) = true
  AND NOT EXISTS (SELECT 1 FROM buscontrol.bus_beneficiaries b WHERE b.student_id = s.id);

COMMIT;
