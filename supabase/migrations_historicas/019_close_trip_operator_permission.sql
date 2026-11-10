-- =============================================================================
-- close_trip: permitir cerrar si el operador inició el viaje o tiene asignación
-- en la fecha del viaje (no solo CURRENT_DATE).
-- ADDITIVO: reemplaza close_trip (aplicar tras 018).
-- =============================================================================

CREATE OR REPLACE FUNCTION buscontrol.close_trip(p_trip_id uuid)
RETURNS buscontrol.bus_trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role buscontrol.app_role;
  v_trip buscontrol.bus_trips;
  v_can_close boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  v_role := buscontrol.current_app_role();
  IF v_role NOT IN ('chofer', 'coordinador') THEN
    RAISE EXCEPTION 'Solo el chofer puede cerrar el viaje.';
  END IF;

  SELECT * INTO v_trip
  FROM buscontrol.bus_trips
  WHERE id = p_trip_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no encontrado o ya cerrado.';
  END IF;

  v_can_close :=
    buscontrol.user_assigned_to_bus(v_trip.bus_id)
    OR EXISTS (
      SELECT 1
      FROM buscontrol.bus_crew_assignments bca
      WHERE bca.user_id = v_user
        AND bca.bus_id = v_trip.bus_id
        AND bca.assignment_date = v_trip.trip_date
        AND bca.is_active = true
    )
    OR v_trip.started_by = v_user
    OR v_trip.operator_id = v_user;

  IF NOT v_can_close THEN
    RAISE EXCEPTION 'No tienes permiso para cerrar este viaje.';
  END IF;

  UPDATE buscontrol.bus_trips
  SET status = 'completed', ended_at = now()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  RETURN v_trip;
END;
$$;

COMMENT ON FUNCTION buscontrol.close_trip(uuid) IS
  'Cierra viaje activo: asignación hoy/fecha del viaje, coordinador, o quien lo inició.';
