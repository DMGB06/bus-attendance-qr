-- =============================================================================
-- 038 - Lista de la auditoria del panel web (administrador)
-- NO aplicada en produccion. Requiere 026 (admin_audit_log), 029 (_require_web_admin).
-- Solo AGREGA 1 funcion de lectura. No cambia tablas ni politicas.
--
-- admin_list_audit: movimientos de admin_audit_log del mas reciente al mas antiguo, solo administrador,
--   con filtro de fechas (p_desde / p_hasta, ambas INCLUIDAS, dia calendario en America/Lima; NULL = sin limite),
--   filtro de tipo (p_grupo: alumnos | apoderados | cuentas | carnets | sesiones; NULL = todos) y paginacion
--   (maximo 100 filas por pagina; total = filas que cumplen el filtro).
--   Devuelve el correo de quien lo hizo, el alumno y el apoderado afectados (nombre ya resuelto, NULL si no
--   aplica o ya no existe) y details SIN datos tecnicos (se quitan ip, user_agent, auth_user_id, student_ids y aal).
--   Las contrasenas nunca se guardan en el registro.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.admin_list_audit(
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL,
  p_grupo text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  action text,
  actor_email text,
  student_id uuid,
  student_name text,
  guardian_id uuid,
  guardian_name text,
  details jsonb,
  total bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
BEGIN
  PERFORM buscontrol._require_web_admin();
  IF p_grupo IS NOT NULL AND p_grupo NOT IN ('alumnos', 'apoderados', 'cuentas', 'carnets', 'sesiones') THEN
    RAISE EXCEPTION 'Tipo inválido.';
  END IF;
  IF p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde > p_hasta THEN
    RAISE EXCEPTION 'La fecha inicial no puede ser posterior a la final.';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Paginación inválida.';
  END IF;

  -- Se filtra y se cuenta sobre el registro sin unir nada; se corta la pagina y SOLO a esas filas se les resuelve el
  -- correo, el alumno y el apoderado. El registro crece sin limite: el costo de una pagina no debe crecer con el.
  RETURN QUERY
  WITH filtrado AS (
    SELECT l.id, l.created_at
    FROM buscontrol.admin_audit_log l
    WHERE (p_desde IS NULL OR l.created_at >= (p_desde::timestamp AT TIME ZONE 'America/Lima'))
      AND (p_hasta IS NULL OR l.created_at < ((p_hasta + 1)::timestamp AT TIME ZONE 'America/Lima'))
      AND (p_grupo IS NULL
           OR (p_grupo = 'alumnos' AND l.action LIKE 'beneficiary\_%')
           OR (p_grupo = 'apoderados' AND l.action IN ('guardian_create', 'guardian_update', 'guardian_activate', 'guardian_deactivate', 'guardian_link', 'guardian_unlink', 'guardian_set_primary'))
           OR (p_grupo = 'cuentas' AND l.action LIKE 'guardian\_account\_%')
           OR (p_grupo = 'carnets' AND l.action LIKE 'qr\_%')
           OR (p_grupo = 'sesiones' AND l.action LIKE 'session\_%'))
  ),
  total AS (SELECT count(*) AS n FROM filtrado),
  pagina AS (
    SELECT f.id, f.created_at FROM filtrado f
    ORDER BY f.created_at DESC, f.id
    LIMIT least(p_limit, 100) OFFSET p_offset
  ),
  filas AS (
    SELECT l.id AS lid, l.created_at AS lat, l.action AS lact, l.actor_id,
           (l.details - ARRAY['ip', 'user_agent', 'auth_user_id', 'student_ids', 'aal', 'student_id']) AS ldet,
           CASE
             WHEN l.action LIKE 'beneficiary\_%' AND l.entity_id IS NOT NULL THEN l.entity_id
             WHEN l.details->>'student_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (l.details->>'student_id')::uuid
           END AS sid,
           CASE WHEN l.entity IN ('bus_guardians', 'bus_student_guardians') THEN l.entity_id END AS gid
    FROM pagina p
    JOIN buscontrol.admin_audit_log l ON l.id = p.id
  )
  SELECT b.lid, b.lat, b.lact, u.email::text, b.sid, s.nombre_alumno, b.gid, g.full_name, b.ldet, (SELECT n FROM total)
  FROM filas b
  LEFT JOIN auth.users u ON u.id = b.actor_id
  LEFT JOIN public.social_bus_escolar s ON s.id = b.sid
  LEFT JOIN buscontrol.bus_guardians g ON g.id = b.gid
  ORDER BY b.lat DESC, b.lid;
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_list_audit(date, date, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_audit(date, date, text, integer, integer) TO authenticated;

COMMIT;
