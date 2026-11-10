-- =============================================================================
-- Fase D — Idempotencia webhook push + columna trazabilidad notification_log
-- Pre-requisito: 009_push_notifications.sql aplicado.
-- Ejecutar en SQL Editor antes de redesplegar send-attendance-push.
-- =============================================================================

ALTER TABLE buscontrol.notification_log
  ADD COLUMN IF NOT EXISTS attendance_record_id uuid
  REFERENCES buscontrol.bus_attendance_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_log_attendance_record
  ON buscontrol.notification_log (attendance_record_id)
  WHERE attendance_record_id IS NOT NULL;

-- Receipt atómico: evita doble push si el webhook se reintenta
CREATE TABLE IF NOT EXISTS buscontrol.push_webhook_receipts (
  attendance_record_id uuid NOT NULL
    REFERENCES buscontrol.bus_attendance_records(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attendance_record_id, event_key)
);

ALTER TABLE buscontrol.push_webhook_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_push_webhook_receipts" ON buscontrol.push_webhook_receipts;
CREATE POLICY "service_role_push_webhook_receipts" ON buscontrol.push_webhook_receipts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON buscontrol.push_webhook_receipts TO service_role;
