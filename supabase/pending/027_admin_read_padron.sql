-- =============================================================================
-- 027 - Lectura del padron municipal para el administrador web
-- NO aplicada. NO EJECUTAR EN PRODUCCION sin avisar antes a TI SIGEM:
-- public.social_bus_escolar es un schema compartido con el sistema municipal
-- (ver aviso en 014_security_crew_and_padron.sql).
--
-- Requiere 025 y 026 (usa buscontrol.is_web_admin()).
-- Solo agrega una politica SELECT; no elimina ni modifica las existentes
-- (ops_read_padron y guardian_read_linked_padron siguen igual).
-- Sin esta politica el administrador lee 0 filas del padron, sin error.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "admin_read_padron" ON public.social_bus_escolar;
CREATE POLICY "admin_read_padron" ON public.social_bus_escolar
  FOR SELECT TO authenticated
  USING (buscontrol.is_web_admin());

COMMIT;
