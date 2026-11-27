-- Ejecutar cada sentencia fuera de una transacción para permitir las escrituras del móvil.
-- El listado usa el orden por fecha y puede leer el índice directamente desde la primera página.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bus_trips_admin_date
  ON buscontrol.bus_trips (trip_date DESC, started_at DESC NULLS LAST, id);

-- Incluye eventos anulados, que también se muestran en el detalle.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bus_attendance_trip_scanned
  ON buscontrol.bus_attendance_records (trip_id, scanned_at DESC NULLS LAST, id);
