-- =============================================================================
-- 036 - Lista de carnets y auditoria de impresion del panel web (administrador)
-- NO aplicada en produccion. Requiere 026 (qr_codes, admin_audit_log), 028 (bus_beneficiaries) y 029 (_require_web_admin).
-- Solo AGREGA 3 funciones. No cambia tablas ni politicas.
--
-- admin_list_cards: beneficiarios ACTIVOS con el estado de su carnet, con busqueda, filtro y paginacion
--   (maximo 100 filas por pagina; total = filas que cumplen el filtro).
--   estado_carnet: 'vigente' (vigente emitido este anio, en hora de Lima), 'vencido' (vigente de un anio
--                  anterior), 'perdido' (sin vigente y el ultimo fue reportado perdido), 'sin_carnet'.
--   filtro: 'vigente', 'vencido', 'perdido' o 'por_emitir' (sin_carnet + vencido + perdido).
--   busqueda: nombre o codigo (sin distinguir mayusculas) o DNI por prefijo; % _ \ son texto literal.
--   Es la misma regla de TypeScript de web/lib/carnet/estado.ts (el anio se evalua en Lima, no en UTC).
-- issue_qr_cards: emision de varios carnets en una sola transaccion (todos o ninguno).
-- log_qr_print: deja en admin_audit_log una fila 'qr_print' por descarga (formato y cantidad), solo administrador.
--   Descargar no cambia ningun carnet. De 1 a 200 alumnos, todos existentes en el padron.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION buscontrol.admin_list_cards(
  p_q text DEFAULT NULL,
  p_filtro text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  student_id uuid,
  codigo text,
  nombre text,
  card_status text,
  card_issued_at timestamptz,
  card_year integer,
  estado_carnet text,
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
  v_anio integer := extract(year FROM now() AT TIME ZONE 'America/Lima')::integer;
BEGIN
  PERFORM buscontrol._require_web_admin();
  IF p_filtro IS NOT NULL AND p_filtro NOT IN ('vigente', 'vencido', 'perdido', 'por_emitir') THEN
    RAISE EXCEPTION 'Filtro inválido.';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Paginación inválida.';
  END IF;

  v_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  IF p_filtro IS NULL THEN
    -- Sin filtro de estado: se filtra y se cuenta sin mirar los carnets, se corta la pagina y el estado del carnet
    -- se calcula solo para esas filas.
    RETURN QUERY
    WITH filtrado AS (
      SELECT s.id, s.nombre_alumno
      FROM public.social_bus_escolar s
      JOIN buscontrol.bus_beneficiaries b ON b.student_id = s.id AND b.is_active
      WHERE v_q = ''
         OR s.nombre_alumno ILIKE '%' || v_like || '%'
         OR lower(s.codigo) LIKE lower(v_like) || '%'
         OR s.dni_alumno LIKE v_like || '%'
    ),
    total AS (SELECT count(*) AS n FROM filtrado),
    pagina AS (
      SELECT f.id, f.nombre_alumno FROM filtrado f
      ORDER BY f.nombre_alumno, f.id
      LIMIT least(p_limit, 100) OFFSET p_offset
    )
    SELECT s.id, s.codigo, s.nombre_alumno, c.status, c.issued_at,
           extract(year FROM c.issued_at AT TIME ZONE 'America/Lima')::integer,
           CASE WHEN c.status = 'vigente' AND extract(year FROM c.issued_at AT TIME ZONE 'America/Lima')::integer >= v_anio THEN 'vigente'
                WHEN c.status = 'vigente' THEN 'vencido'
                WHEN c.status = 'reportado_perdido' THEN 'perdido'
                ELSE 'sin_carnet' END,
           (SELECT n FROM total)
    FROM pagina p
    JOIN public.social_bus_escolar s ON s.id = p.id
    LEFT JOIN LATERAL (
      SELECT q.status, q.issued_at
      FROM buscontrol.qr_codes q
      WHERE q.student_id = s.id
      ORDER BY (q.status = 'vigente') DESC, q.issued_at DESC
      LIMIT 1
    ) c ON true
    ORDER BY p.nombre_alumno, p.id;
  ELSE
    -- Con filtro de estado hay que conocer el carnet de todos los que cumplen la busqueda (el estado depende de el).
    RETURN QUERY
    WITH base AS (
      SELECT s.id, s.codigo, s.nombre_alumno, c.status, c.issued_at,
             extract(year FROM c.issued_at AT TIME ZONE 'America/Lima')::integer AS anio,
             CASE WHEN c.status = 'vigente' AND extract(year FROM c.issued_at AT TIME ZONE 'America/Lima')::integer >= v_anio THEN 'vigente'
                  WHEN c.status = 'vigente' THEN 'vencido'
                  WHEN c.status = 'reportado_perdido' THEN 'perdido'
                  ELSE 'sin_carnet' END AS estado
      FROM public.social_bus_escolar s
      JOIN buscontrol.bus_beneficiaries b ON b.student_id = s.id AND b.is_active
      LEFT JOIN LATERAL (
        SELECT q.status, q.issued_at
        FROM buscontrol.qr_codes q
        WHERE q.student_id = s.id
        ORDER BY (q.status = 'vigente') DESC, q.issued_at DESC
        LIMIT 1
      ) c ON true
      WHERE v_q = ''
         OR s.nombre_alumno ILIKE '%' || v_like || '%'
         OR lower(s.codigo) LIKE lower(v_like) || '%'
         OR s.dni_alumno LIKE v_like || '%'
    )
    SELECT base.id, base.codigo, base.nombre_alumno, base.status, base.issued_at, base.anio, base.estado, count(*) OVER ()
    FROM base
    WHERE (p_filtro = 'por_emitir' AND base.estado <> 'vigente') OR base.estado = p_filtro
    ORDER BY base.nombre_alumno, base.id
    LIMIT least(p_limit, 100) OFFSET p_offset;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION buscontrol.log_qr_print(p_student_ids uuid[], p_format text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_user uuid := buscontrol._require_web_admin();
  v_n integer := coalesce(array_length(p_student_ids, 1), 0);
BEGIN
  IF p_format IS NULL OR p_format NOT IN ('pdf', 'png') THEN
    RAISE EXCEPTION 'Formato inválido.';
  END IF;
  IF v_n < 1 OR v_n > 200 THEN
    RAISE EXCEPTION 'Elige de 1 a 200 alumnos.';
  END IF;
  IF (SELECT count(*) FROM public.social_bus_escolar WHERE id = ANY (p_student_ids)) <> (SELECT count(DISTINCT x) FROM unnest(p_student_ids) x) THEN
    RAISE EXCEPTION 'Alumno no encontrado.';
  END IF;

  INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
  VALUES (v_user, 'qr_print', 'qr_codes', NULL,
          jsonb_build_object('format', p_format, 'count', v_n, 'student_ids', to_jsonb(p_student_ids)));
END;
$$;

-- issue_qr_cards: emite carnet a varios alumnos en UNA transaccion (todos o ninguno). Usa issue_qr_card para cada uno
-- (mismo codigo; el vigente anterior queda reemplazado) y devuelve cuantos emitio. De 1 a 200 alumnos, sin repetidos.
-- Si uno falla (sin codigo, no es beneficiario activo...) no se emite ninguno.
CREATE OR REPLACE FUNCTION buscontrol.issue_qr_cards(p_student_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public, pg_temp
AS $$
DECLARE
  v_ids uuid[];
  v_id uuid;
  v_n integer := 0;
BEGIN
  PERFORM buscontrol._require_web_admin();
  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_student_ids) x WHERE x IS NOT NULL;
  IF coalesce(array_length(v_ids, 1), 0) < 1 OR array_length(v_ids, 1) > 200 THEN
    RAISE EXCEPTION 'Elige de 1 a 200 alumnos.';
  END IF;
  FOREACH v_id IN ARRAY v_ids LOOP
    PERFORM buscontrol.issue_qr_card(v_id);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION buscontrol.admin_list_cards(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.log_qr_print(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION buscontrol.issue_qr_cards(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscontrol.admin_list_cards(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.log_qr_print(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscontrol.issue_qr_cards(uuid[]) TO authenticated;

COMMIT;
