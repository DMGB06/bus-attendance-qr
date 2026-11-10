-- =============================================================================
-- 035 - Lista y detalle de apoderados del panel web (administrador)
-- NO aplicada en produccion. Requiere 029 (_require_web_admin, politicas de lectura) y 032 (cuentas).
-- Solo AGREGA 2 funciones de lectura. No cambia tablas ni politicas.
--
-- admin_list_guardians: lista con busqueda, filtro y paginacion (maximo 100 filas por pagina).
--   filtro: 'activo', 'desactivado', 'con_cuenta' o 'sin_cuenta' (NULL = todos)
--   busqueda: nombre (sin distinguir mayusculas), telefono (solo digitos, se ignora +51) o DNI por prefijo.
--             % _ \ se buscan como texto. total = filas que cumplen el filtro, no solo la pagina.
-- admin_guardian_detail: un apoderado con el estado de su cuenta y sus alumnos, en un solo jsonb.
--   account_active: NULL si no tiene cuenta, true/false segun app_profiles.is_active (el administrador
--   no puede leer app_profiles directo, por eso va aqui). No devuelve claves ni datos de Auth.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.admin_list_guardians(
  p_q text DEFAULT NULL,
  p_filtro text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  guardian_id uuid,
  full_name text,
  phone text,
  is_active boolean,
  has_account boolean,
  students_count bigint,
  first_student text,
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
  v_digits text;
BEGIN
  PERFORM buscontrol._require_web_admin();
  IF p_filtro IS NOT NULL AND p_filtro NOT IN ('activo', 'desactivado', 'con_cuenta', 'sin_cuenta') THEN
    RAISE EXCEPTION 'Filtro inválido.';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Paginación inválida.';
  END IF;

  v_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  v_digits := regexp_replace(v_q, '\D', '', 'g');
  -- Los celulares de Perú empiezan con 9, así que un 51 al inicio es el prefijo del país (también parcial: +51 987).
  IF length(v_digits) > 2 AND left(v_digits, 2) = '51' THEN v_digits := substr(v_digits, 3); END IF;

  -- Se filtra y se cuenta sin unir nada; el conteo de alumnos por apoderado solo se calcula para las filas de la pagina.
  RETURN QUERY
  WITH filtrado AS (
    SELECT g.id, g.full_name
    FROM buscontrol.bus_guardians g
    WHERE (v_q = ''
           OR g.full_name ILIKE '%' || v_like || '%'
           OR (v_digits <> '' AND g.phone_normalized LIKE v_digits || '%')
           OR g.dni LIKE v_like || '%')
      AND (p_filtro IS NULL
           OR (p_filtro = 'activo' AND g.is_active)
           OR (p_filtro = 'desactivado' AND NOT g.is_active)
           OR (p_filtro = 'con_cuenta' AND g.auth_user_id IS NOT NULL)
           OR (p_filtro = 'sin_cuenta' AND g.auth_user_id IS NULL))
  ),
  total AS (SELECT count(*) AS n FROM filtrado),
  pagina AS (
    SELECT f.id, f.full_name FROM filtrado f
    ORDER BY f.full_name, f.id
    LIMIT least(p_limit, 100) OFFSET p_offset
  )
  SELECT g.id, g.full_name, g.phone, g.is_active, g.auth_user_id IS NOT NULL,
         s.n, s.first_name, (SELECT n FROM total)
  FROM pagina p
  JOIN buscontrol.bus_guardians g ON g.id = p.id
  LEFT JOIN LATERAL (
    SELECT count(*) AS n, min(e.nombre_alumno) AS first_name
    FROM buscontrol.bus_student_guardians sg
    JOIN public.social_bus_escolar e ON e.id = sg.student_id
    WHERE sg.guardian_id = g.id
  ) s ON true
  ORDER BY p.full_name, p.id;
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.admin_guardian_detail(p_guardian_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  g buscontrol.bus_guardians;
BEGIN
  PERFORM buscontrol._require_web_admin();
  SELECT * INTO g FROM buscontrol.bus_guardians WHERE id = p_guardian_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apoderado no encontrado.';
  END IF;

  RETURN jsonb_build_object(
    'guardian', jsonb_build_object(
      'id', g.id, 'full_name', g.full_name, 'phone', g.phone, 'dni', g.dni, 'email', g.email,
      'notes', g.notes, 'is_active', g.is_active, 'has_account', g.auth_user_id IS NOT NULL),
    'account_active', (SELECT p.is_active FROM buscontrol.app_profiles p WHERE p.id = g.auth_user_id),
    'students', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'student_id', e.id, 'nombre', e.nombre_alumno, 'codigo', e.codigo,
               'relationship', sg.relationship, 'is_primary', sg.is_primary,
               'primary_name', (SELECT pg2.full_name
                                FROM buscontrol.bus_student_guardians sg2
                                JOIN buscontrol.bus_guardians pg2 ON pg2.id = sg2.guardian_id
                                WHERE sg2.student_id = e.id AND sg2.is_primary AND sg2.guardian_id <> g.id
                                LIMIT 1))
             ORDER BY e.nombre_alumno)
      FROM buscontrol.bus_student_guardians sg
      JOIN public.social_bus_escolar e ON e.id = sg.student_id
      WHERE sg.guardian_id = g.id), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_list_guardians(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.admin_guardian_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_guardians(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.admin_guardian_detail(uuid) TO authenticated;

COMMIT;
