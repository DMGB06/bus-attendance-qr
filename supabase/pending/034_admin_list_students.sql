-- =============================================================================
-- 034 - Lista de alumnos del panel web (administrador)
-- NO aplicada en produccion. Requiere 026 (qr_codes), 028 (bus_beneficiaries) y 029 (_require_web_admin).
-- Solo AGREGA una funcion de lectura. No cambia tablas ni politicas.
--
-- Une en una sola consulta el padron (public.social_bus_escolar, solo lectura), el estado de
-- beneficiario, el apoderado principal y el carnet vigente, con busqueda, filtro de estado y
-- paginacion. PostgREST no une tablas de schemas distintos y filtrar por estado con listas de ids
-- no escala, por eso va en una funcion.
--   estado: 'beneficiario' (alta activa), 'baja' (dado de baja), 'sin_alta' (nunca dado de alta)
--   busqueda: nombre o codigo (sin distinguir mayusculas) o DNI por prefijo; % _ \ son texto literal.
--             El codigo se compara con lower(codigo) LIKE para poder usar el indice de 039_indexes_padron.sql.
--   limite: maximo 100 filas por pagina. total = filas que cumplen el filtro (no solo la pagina).
-- No devuelve el DNI ni la direccion del alumno: se ven solo en la ficha.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.admin_list_students(
  p_q text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  student_id uuid,
  codigo text,
  nombre text,
  colegio text,
  nivel text,
  edad integer,
  estado text,
  principal_name text,
  principal_phone text,
  card_status text,
  card_issued_at timestamptz,
  total bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_q text := left(trim(coalesce(p_q, '')), 100);
  v_like text;
BEGIN
  PERFORM buscontrol._require_web_admin();
  IF p_estado IS NOT NULL AND p_estado NOT IN ('beneficiario', 'baja', 'sin_alta') THEN
    RAISE EXCEPTION 'Estado inválido.';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Paginación inválida.';
  END IF;

  -- Escapa \ % _ para que se busquen como texto
  v_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  -- Primero se filtra y se cuenta con columnas livianas, se corta la pagina, y SOLO a esas filas se les une el
  -- apoderado principal y el carnet. Asi el costo no crece con el tamano del padron.
  RETURN QUERY
  WITH filtrado AS (
    SELECT s.id, s.nombre_alumno
    FROM public.social_bus_escolar s
    LEFT JOIN buscontrol.bus_beneficiaries b ON b.student_id = s.id
    WHERE (v_q = ''
           OR s.nombre_alumno ILIKE '%' || v_like || '%'
           OR lower(s.codigo) LIKE lower(v_like) || '%'
           OR s.dni_alumno LIKE v_like || '%')
      AND (p_estado IS NULL
           OR (p_estado = 'sin_alta' AND b.student_id IS NULL)
           OR (p_estado = 'beneficiario' AND b.is_active)
           OR (p_estado = 'baja' AND b.student_id IS NOT NULL AND NOT b.is_active))
  ),
  total AS (SELECT count(*) AS n FROM filtrado),
  pagina AS (
    SELECT f.id, f.nombre_alumno FROM filtrado f
    ORDER BY f.nombre_alumno, f.id
    LIMIT least(p_limit, 100) OFFSET p_offset
  )
  SELECT s.id, s.codigo, s.nombre_alumno, s.colegio, s.nivel_educativo, s.edad,
         CASE WHEN b.student_id IS NULL THEN 'sin_alta'
              WHEN b.is_active THEN 'beneficiario'
              ELSE 'baja' END,
         pg.full_name, pg.phone,
         q.status, q.issued_at,
         (SELECT n FROM total)
  FROM pagina p
  JOIN public.social_bus_escolar s ON s.id = p.id
  LEFT JOIN buscontrol.bus_beneficiaries b ON b.student_id = s.id
  LEFT JOIN LATERAL (
    SELECT g.full_name, g.phone
    FROM buscontrol.bus_student_guardians sg
    JOIN buscontrol.bus_guardians g ON g.id = sg.guardian_id
    WHERE sg.student_id = s.id AND sg.is_primary
    ORDER BY sg.created_at
    LIMIT 1
  ) pg ON true
  LEFT JOIN buscontrol.qr_codes q ON q.student_id = s.id AND q.status = 'vigente'
  ORDER BY p.nombre_alumno, p.id;
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_list_students(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_students(text, text, integer, integer) TO authenticated;

COMMIT;
