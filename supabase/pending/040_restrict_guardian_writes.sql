-- =============================================================================
-- 040 - Solo las funciones del panel escriben apoderados y vinculos
-- NO aplicada en produccion. Quita las politicas heredadas del esquema base (0001 / 008) que dejaban al rol
-- coordinador escribir DIRECTO en bus_guardians y bus_student_guardians, sin auditoria y sin pasar por las
-- funciones de 029/032. Hallazgo de la revision de seguridad del 2026-11-09 (docs/web/informes/etapa4-pruebas-por-rol.md).
-- La app movil solo LEE estas tablas (politicas *_read_* y ops_read_*, que no se tocan). Las funciones SECURITY DEFINER
-- del panel siguen escribiendo con el dueno de la tabla. Se quitan tambien los permisos de escritura de authenticated.
-- Requiere confirmar con quien opere la app movil que ningun coordinador gestione apoderados desde ella.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS coordinator_manage_bus_guardians ON buscontrol.bus_guardians;
DROP POLICY IF EXISTS coordinator_manage_bus_student_guardians ON buscontrol.bus_student_guardians;
REVOKE INSERT, UPDATE, DELETE ON buscontrol.bus_guardians, buscontrol.bus_student_guardians FROM authenticated;

COMMIT;
