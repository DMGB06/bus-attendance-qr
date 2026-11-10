-- =============================================================================
-- close_trip: permitir cerrar viaje activo asignado aunque no sea CURRENT_DATE
-- (viajes activos de días anteriores que quedaron abiertos).
-- ADDITIVO: solo reemplaza la función close_trip.
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

  IF NOT buscontrol.user_assigned_to_bus(v_trip.bus_id) THEN
    RAISE EXCEPTION 'No estás asignado a este bus hoy.';
  END IF;

  UPDATE buscontrol.bus_trips
  SET status = 'completed', ended_at = now()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  RETURN v_trip;
END;
$$;

COMMENT ON FUNCTION buscontrol.close_trip(uuid) IS
  'Cierra un viaje activo del bus asignado al operador (sin exigir trip_date = hoy).';
