-- =============================================================================
-- 021 — Lectura segura del perfil propio (app_profiles)
-- Corrige "permission denied for table app_profiles" al sincronizar cola offline.
-- Ejecutar en Supabase → SQL Editor (proyecto CerroBus / buscontrol).
-- =============================================================================

-- Política SELECT propia (idempotente)
ALTER TABLE buscontrol.app_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_own_app_profile ON buscontrol.app_profiles;
CREATE POLICY read_own_app_profile ON buscontrol.app_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

GRANT SELECT ON buscontrol.app_profiles TO authenticated;

-- RPC: perfil del usuario autenticado sin depender de RLS en el cliente
CREATE OR REPLACE FUNCTION buscontrol.get_own_profile()
RETURNS buscontrol.app_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = buscontrol, public
STABLE
AS $$
  SELECT *
  FROM buscontrol.app_profiles
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION buscontrol.get_own_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION buscontrol.get_own_profile() TO authenticated;

-- Usado por register_attendance y políticas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'buscontrol' AND p.proname = 'current_app_role'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION buscontrol.current_app_role() TO authenticated';
  END IF;
END $$;
