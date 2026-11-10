-- =============================================================================
-- 023 — Un viaje por turno por día (mismo bus)
-- Pre-requisito: 013 (validate_can_start_turn) aplicado.
-- Ejecutar en Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION buscontrol.validate_can_start_turn(
  p_bus_id uuid,
  p_turn_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
DECLARE
  v_direction text;
BEGIN
  IF p_turn_type NOT IN ('mañana', 'tarde_primaria', 'tarde_secundaria', 'tarde_unica', 'tarde') THEN
    RAISE EXCEPTION 'Turno inválido.';
  END IF;

  v_direction := CASE WHEN p_turn_type = 'mañana' THEN 'recojo' ELSE 'retorno' END;

  -- No repetir el mismo tramo si ya se cerró hoy en esta unidad.
  IF EXISTS (
    SELECT 1
    FROM buscontrol.bus_trips
    WHERE bus_id = p_bus_id
      AND trip_date = CURRENT_DATE
      AND turn_type = p_turn_type
      AND status = 'completed'
  ) THEN
    CASE p_turn_type
      WHEN 'mañana' THEN
        RAISE EXCEPTION 'Ya registraste el recojo de mañana hoy. Inicia el viaje de tarde.';
      WHEN 'tarde_primaria' THEN
        RAISE EXCEPTION 'Ya completaste tarde primaria hoy.';
      WHEN 'tarde_secundaria' THEN
        RAISE EXCEPTION 'Ya completaste tarde secundaria hoy.';
      WHEN 'tarde_unica' THEN
        RAISE EXCEPTION 'Ya completaste el viaje único de tarde hoy.';
      ELSE
        RAISE EXCEPTION 'Ya completaste este tramo de tarde hoy.';
    END CASE;
  END IF;

  IF v_direction = 'retorno' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM buscontrol.bus_trips
      WHERE bus_id = p_bus_id
        AND trip_date = CURRENT_DATE
        AND direction = 'recojo'
        AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Debes completar el viaje de recojo de la mañana antes de iniciar la tarde.';
    END IF;
  END IF;

  IF p_turn_type = 'tarde_secundaria' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM buscontrol.bus_trips
      WHERE bus_id = p_bus_id
        AND trip_date = CURRENT_DATE
        AND turn_type = 'tarde_primaria'
        AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Debes completar el viaje de tarde primaria antes de iniciar tarde secundaria.';
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION buscontrol.validate_can_start_turn(uuid, text) IS
  'Valida orden de turnos y bloquea duplicar el mismo turn_type completado el mismo día.';
