-- Ejecutar fuera de una transacción para permitir las escrituras del móvil.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bus_attendance_student
  ON buscontrol.bus_attendance_records (student_id);
