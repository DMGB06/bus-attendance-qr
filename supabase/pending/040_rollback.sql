-- Rollback de 040: devuelve al coordinador la escritura directa (como en el esquema base).
BEGIN;
GRANT INSERT, UPDATE, DELETE ON buscontrol.bus_guardians, buscontrol.bus_student_guardians TO authenticated;
CREATE POLICY coordinator_manage_bus_guardians ON buscontrol.bus_guardians FOR ALL TO authenticated
  USING (buscontrol.current_app_role() = 'coordinador'::buscontrol.app_role)
  WITH CHECK (buscontrol.current_app_role() = 'coordinador'::buscontrol.app_role);
CREATE POLICY coordinator_manage_bus_student_guardians ON buscontrol.bus_student_guardians FOR ALL TO authenticated
  USING (buscontrol.current_app_role() = 'coordinador'::buscontrol.app_role)
  WITH CHECK (buscontrol.current_app_role() = 'coordinador'::buscontrol.app_role);
COMMIT;
