-- Ejecutar fuera de una transacción para permitir las escrituras del móvil.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bus_attendance_incidents
  ON buscontrol.bus_attendance_records (trip_id) INCLUDE (id, event_type, voided_at, scanned_at)
  WHERE voided_at IS NOT NULL OR event_type = 'ausente';
