-- Fase 4 — Push notifications: preferencias, lookup apoderados, RLS.
-- Ejecutar en SQL Editor tras 008.

-- =============================================================================
-- Preferencias por apoderado (4 eventos clave)
-- =============================================================================
CREATE TABLE IF NOT EXISTS buscontrol.guardian_notification_preferences (
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guardian_user_id, event_key),
  CONSTRAINT guardian_notification_preferences_event_key_check CHECK (
    event_key = ANY (
      ARRAY[
        'recojo_subio'::text,
        'recojo_bajo'::text,
        'retorno_subio'::text,
        'retorno_bajo'::text
      ]
    )
  )
);

-- =============================================================================
-- Apoderados destino para push (catálogo municipal + student_guardians)
-- =============================================================================
CREATE OR REPLACE FUNCTION buscontrol.guardian_user_ids_for_student(p_student_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT DISTINCT uid
  FROM (
    SELECT sg.guardian_user_id AS uid
    FROM buscontrol.student_guardians sg
    WHERE sg.student_id = p_student_id

    UNION

    SELECT bg.auth_user_id AS uid
    FROM buscontrol.bus_student_guardians bsg
    JOIN buscontrol.bus_guardians bg ON bg.id = bsg.guardian_id
    WHERE bsg.student_id = p_student_id
      AND bg.is_active = true
      AND bg.auth_user_id IS NOT NULL
  ) guardians
  WHERE uid IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION buscontrol.guardian_user_ids_for_student(uuid) TO authenticated, service_role;

-- =============================================================================
-- RLS — device_push_tokens
-- =============================================================================
ALTER TABLE buscontrol.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_manage_own_push_tokens" ON buscontrol.device_push_tokens;
CREATE POLICY "guardian_manage_own_push_tokens" ON buscontrol.device_push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_push_tokens" ON buscontrol.device_push_tokens;
CREATE POLICY "service_role_push_tokens" ON buscontrol.device_push_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS — notification_log
-- =============================================================================
ALTER TABLE buscontrol.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_read_own_notification_log" ON buscontrol.notification_log;
CREATE POLICY "guardian_read_own_notification_log" ON buscontrol.notification_log
  FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_notification_log" ON buscontrol.notification_log;
CREATE POLICY "service_role_notification_log" ON buscontrol.notification_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS — guardian_notification_preferences
-- =============================================================================
ALTER TABLE buscontrol.guardian_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_manage_own_notification_prefs" ON buscontrol.guardian_notification_preferences;
CREATE POLICY "guardian_manage_own_notification_prefs" ON buscontrol.guardian_notification_preferences
  FOR ALL TO authenticated
  USING (guardian_user_id = auth.uid())
  WITH CHECK (guardian_user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_notification_prefs" ON buscontrol.guardian_notification_preferences;
CREATE POLICY "service_role_notification_prefs" ON buscontrol.guardian_notification_preferences
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON buscontrol.guardian_notification_preferences TO authenticated;
