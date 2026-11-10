-- Rollback de 024: restaura las definiciones vivas tomadas de pg_get_functiondef.
-- Pegar aqui register_attendance y void_attendance_record desde el volcado antes de aplicar 024.
-- Antes de aplicar 024 ejecutar y guardar:
--   select pg_get_functiondef('buscontrol.register_attendance(uuid,uuid,text,buscontrol.crew_role)'::regprocedure);
--   select pg_get_functiondef('buscontrol.void_attendance_record(uuid,text)'::regprocedure);

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.user_assigned_to_bus(p_bus_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = auth.uid()
        AND bca.bus_id = p_bus_id
        AND bca.assignment_date = CURRENT_DATE
        AND bca.is_active = true
    )
    OR buscontrol.current_app_role() = 'coordinador'
    OR buscontrol.user_has_pilot_bus_access(p_bus_id);
$function$;

CREATE OR REPLACE FUNCTION buscontrol.get_user_bus_id_today()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'buscontrol', 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT bca.bus_id
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = auth.uid()
        AND bca.assignment_date = CURRENT_DATE
        AND bca.is_active = true
      ORDER BY CASE bca.crew_role WHEN 'chofer' THEN 0 ELSE 1 END
      LIMIT 1
    ),
    CASE
      WHEN buscontrol.current_app_role() IN ('chofer', 'asistenta', 'coordinador')
       AND buscontrol.is_single_bus_pilot_mode()
      THEN buscontrol.get_default_pilot_bus_id()
      ELSE NULL
    END
  );
$function$;

COMMIT;
