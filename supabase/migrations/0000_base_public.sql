


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."social_bus_escolar" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre_alumno" "text" NOT NULL,
    "dni_alumno" "text" NOT NULL,
    "edad" integer,
    "sexo" "text",
    "colegio" "text",
    "nombre_apoderado" "text",
    "telefono_apoderado" "text",
    "dni_apoderado" "text",
    "direccion" "text",
    "usuario_registro" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "codigo" "text",
    "foto_url" "text",
    "activo" boolean DEFAULT true,
    "notas" "text",
    "nombre_alumno_norm" "text",
    "enrollment_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "nivel_educativo" "text",
    CONSTRAINT "social_bus_escolar_nivel_educativo_check" CHECK ((("nivel_educativo" IS NULL) OR ("nivel_educativo" = ANY (ARRAY['primaria'::"text", 'secundaria'::"text"]))))
);


ALTER TABLE "public"."social_bus_escolar" OWNER TO "postgres";


COMMENT ON COLUMN "public"."social_bus_escolar"."nivel_educativo" IS 'Nivel educativo del alumno (primaria/secundaria) para filtros sugeridos en tramos tarde.';



CREATE OR REPLACE FUNCTION "public"."crear_ciudadano_desde_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_dni text;
  v_correo text;
  v_existente public.biblioteca_ciudadanos%rowtype;
begin
  v_dni := trim(coalesce(new.raw_user_meta_data ->> 'dni', ''));
  v_correo := lower(trim(coalesce(new.email, '')));

  -- Si no trae DNI, no es ciudadano externo. Puede ser usuario SIGEM.
  if v_dni = '' then
    return new;
  end if;

  if v_correo = '' then
    raise exception 'El correo es obligatorio.';
  end if;

  select *
  into v_existente
  from public.biblioteca_ciudadanos
  where lower(correo) = v_correo
  limit 1;

  if found then
    if v_existente.auth_user_id is not null and v_existente.auth_user_id <> new.id then
      raise exception 'Ya existe una cuenta registrada con ese correo.';
    end if;

    if v_existente.dni <> v_dni then
      raise exception 'El correo ya está asociado a otro DNI.';
    end if;

    update public.biblioteca_ciudadanos
    set
      auth_user_id = new.id,
      nombres = coalesce(new.raw_user_meta_data ->> 'nombres', nombres),
      apellidos = coalesce(new.raw_user_meta_data ->> 'apellidos', apellidos),
      telefono = coalesce(new.raw_user_meta_data ->> 'telefono', telefono),
      direccion = coalesce(new.raw_user_meta_data ->> 'direccion', direccion),
      ocupacion = coalesce(new.raw_user_meta_data ->> 'ocupacion', ocupacion),
      fecha_nacimiento = nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
      clave_hash = 'gestionado_por_supabase_auth',
      estado_cuenta = 'activo'
    where id = v_existente.id;

    return new;
  end if;

  if exists (
    select 1
    from public.biblioteca_ciudadanos
    where dni = v_dni
  ) then
    raise exception 'Ya existe una cuenta registrada con ese DNI.';
  end if;

  insert into public.biblioteca_ciudadanos (
    auth_user_id,
    dni,
    nombres,
    apellidos,
    correo,
    telefono,
    direccion,
    ocupacion,
    fecha_nacimiento,
    clave_hash,
    estado_cuenta
  )
  values (
    new.id,
    v_dni,
    coalesce(new.raw_user_meta_data ->> 'nombres', ''),
    coalesce(new.raw_user_meta_data ->> 'apellidos', ''),
    v_correo,
    coalesce(new.raw_user_meta_data ->> 'telefono', ''),
    coalesce(new.raw_user_meta_data ->> 'direccion', ''),
    coalesce(new.raw_user_meta_data ->> 'ocupacion', ''),
    nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
    'gestionado_por_supabase_auth',
    'activo'
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."crear_ciudadano_desde_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_solicitud_reserva_ciudadano"("p_libro_id" "uuid", "p_fecha_recojo_solicitada" "date", "p_observaciones" "text" DEFAULT NULL::"text", "p_compromiso_aceptado" boolean DEFAULT false) RETURNS TABLE("solicitud_id" "uuid", "codigo" "text", "estado" "text", "fecha_registro" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid;
  v_ciudadano_id uuid;
  v_estado_libro text;
  v_codigo_solicitud text;
  v_solicitud_id uuid;
  v_estado_solicitud text;
  v_fecha_solicitud timestamptz;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Debes iniciar sesión para solicitar una reserva.';
  end if;

  if p_libro_id is null then
    raise exception 'No se recibió el libro que deseas reservar.';
  end if;

  if p_fecha_recojo_solicitada is null then
    raise exception 'Selecciona una fecha estimada de recojo.';
  end if;

  if p_fecha_recojo_solicitada < current_date then
    raise exception 'La fecha de recojo no puede ser anterior a hoy.';
  end if;

  if coalesce(p_compromiso_aceptado, false) is not true then
    raise exception 'Debes aceptar el compromiso de recojo para continuar.';
  end if;

  select c.id
  into v_ciudadano_id
  from public.biblioteca_ciudadanos as c
  where c.auth_user_id = v_auth_user_id
    and c.estado_cuenta = 'activo'
  limit 1
  for update;

  if v_ciudadano_id is null then
    raise exception 'No se encontró un perfil ciudadano activo para tu cuenta.';
  end if;

  select coalesce(l.estado, 'no_disponible')
  into v_estado_libro
  from public.biblioteca_libros as l
  where l.id = p_libro_id
  for update;

  if v_estado_libro is null then
    raise exception 'El libro seleccionado no existe.';
  end if;

  if v_estado_libro <> 'disponible' then
    raise exception 'Este libro ya no está disponible para reserva.';
  end if;

  if exists (
    select 1
    from public.biblioteca_solicitudes as s
    where s.libro_id = p_libro_id
      and s.estado_solicitud in ('pendiente_revision', 'aprobada')
  ) then
    raise exception 'Este libro ya tiene una solicitud de reserva activa.';
  end if;

  v_codigo_solicitud :=
    'SOL-BASE-' ||
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') ||
    '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  update public.biblioteca_libros as l
  set estado = 'reservado'
  where l.id = p_libro_id
    and l.estado = 'disponible';

  if not found then
    raise exception 'No fue posible reservar el libro. Intenta nuevamente.';
  end if;

  insert into public.biblioteca_solicitudes (
    codigo_solicitud,
    ciudadano_id,
    libro_id,
    fecha_recojo_solicitada,
    estado_solicitud,
    compromiso_aceptado,
    observaciones
  )
  values (
    v_codigo_solicitud,
    v_ciudadano_id,
    p_libro_id,
    p_fecha_recojo_solicitada,
    'pendiente_revision',
    true,
    nullif(btrim(p_observaciones), '')
  )
  returning
    id,
    codigo_solicitud,
    estado_solicitud,
    fecha_solicitud
  into
    v_solicitud_id,
    v_codigo_solicitud,
    v_estado_solicitud,
    v_fecha_solicitud;

  return query
  select
    v_solicitud_id,
    v_codigo_solicitud,
    v_estado_solicitud,
    v_fecha_solicitud;
end;
$$;


ALTER FUNCTION "public"."crear_solicitud_reserva_ciudadano"("p_libro_id" "uuid", "p_fecha_recojo_solicitada" "date", "p_observaciones" "text", "p_compromiso_aceptado" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."es_admin_base"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.area in ('DESARROLLO_SOCIAL', 'ADMIN', 'INFORMATICA')
      and p.role in ('admin', 'visor')
  );
$$;


ALTER FUNCTION "public"."es_admin_base"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."es_operador_base"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.area in ('DESARROLLO_SOCIAL', 'ADMIN', 'INFORMATICA')
      and p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."es_operador_base"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_siguiente_codigo_biblioteca"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    ultimo_codigo TEXT;
    siguiente_numero INTEGER;
BEGIN
    -- Obtener el último código que empiece con 'B'
    SELECT codigo INTO ultimo_codigo 
    FROM biblioteca_libros 
    WHERE codigo ~ '^B[0-9]+$'
    ORDER BY codigo DESC LIMIT 1;

    IF ultimo_codigo IS NULL THEN
        siguiente_numero := 1;
    ELSE
        -- Extraer el número después de la 'B' y sumar 1
        siguiente_numero := CAST(SUBSTRING(ultimo_codigo FROM 2) AS INTEGER) + 1;
    END IF;

    -- Retornar formateado como B0001, B0002...
    RETURN 'B' || LPAD(siguiente_numero::text, 4, '0');
END;
$_$;


ALTER FUNCTION "public"."generar_siguiente_codigo_biblioteca"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_siguiente_codigo_bus"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    ultimo_codigo TEXT;
    siguiente_numero INTEGER;
BEGIN
    -- Obtenemos el último código que empiece con 'BU'
    SELECT codigo INTO ultimo_codigo 
    FROM social_bus_escolar 
    WHERE codigo ~ '^BU[0-9]+$'
    ORDER BY codigo DESC LIMIT 1;

    IF ultimo_codigo IS NULL THEN
        siguiente_numero := 1;
    ELSE
        -- Extraemos el número después de 'BU' y sumamos 1
        siguiente_numero := CAST(SUBSTRING(ultimo_codigo FROM 3) AS INTEGER) + 1;
    END IF;

    -- Retornamos formateado como BU0001
    RETURN 'BU' || LPAD(siguiente_numero::text, 4, '0');
END;
$_$;


ALTER FUNCTION "public"."generar_siguiente_codigo_bus"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."liberar_libro_si_solicitud_cerrada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if
    new.estado_solicitud in ('rechazada', 'cancelada')
    and old.estado_solicitud in ('pendiente_revision', 'aprobada')
  then
    update public.biblioteca_libros
    set estado = 'disponible'
    where id = new.libro_id
      and estado = 'reservado';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."liberar_libro_si_solicitud_cerrada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preparar_comercio_ambulatorio"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_es_privado boolean := false;
  v_siguiente integer := 1;
  v_email text;
BEGIN

  IF TG_OP = 'INSERT' THEN

    -- Evitar dos correlativos iguales si dos personas guardan
    -- al mismo tiempo.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(
        'sigem_ambulatorios_' ||
        coalesce(NEW.anio::text, 'SIN_ANIO'),
        0
      )
    );

    NEW.creado_por_id := auth.uid();

    v_email := auth.jwt() ->> 'email';

    IF v_email IS NOT NULL AND v_email <> '' THEN
      NEW.usuario_registro :=
        split_part(lower(v_email), '@', 1);
    ELSIF NEW.usuario_registro IS NULL
       OR btrim(NEW.usuario_registro) = '' THEN
      NEW.usuario_registro := 'Sistema';
    END IF;

    IF auth.uid() IS NOT NULL THEN
      SELECT coalesce(p.ambulatorios_privados, false)
      INTO v_es_privado
      FROM public.profiles p
      WHERE p.id = auth.uid();

      v_es_privado := coalesce(v_es_privado, false);
    END IF;

    NEW.es_privado := v_es_privado;

    -- El MAX ve también las filas privadas porque esta función
    -- es SECURITY DEFINER.
    SELECT
      coalesce(
        max(
          CASE
            WHEN ca.numero_autorizacion ~ '^[0-9]+$'
              THEN ca.numero_autorizacion::integer
            ELSE NULL
          END
        ),
        0
      ) + 1
    INTO v_siguiente
    FROM public.comercios_ambulatorios ca
    WHERE ca.anio IS NOT DISTINCT FROM NEW.anio;

    NEW.numero_autorizacion :=
      lpad(v_siguiente::text, 3, '0');

    RETURN NEW;
  END IF;


  IF TG_OP = 'UPDATE' THEN
    -- Proteger campos internos.
    NEW.es_privado := OLD.es_privado;
    NEW.creado_por_id := OLD.creado_por_id;
    NEW.numero_autorizacion := OLD.numero_autorizacion;
    NEW.usuario_registro := OLD.usuario_registro;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."preparar_comercio_ambulatorio"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sigem_current_user_area"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p.area::text
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."sigem_current_user_area"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sigem_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."sigem_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sigem_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."sigem_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."solicitar_renovacion_ciudadano"("p_prestamo_id" "uuid") RETURNS TABLE("renovacion_id" "uuid", "estado_renovacion" "text", "fecha_anterior_devolucion" timestamp with time zone, "nueva_fecha_devolucion" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid;
  v_ciudadano_id uuid;
  v_estado_prestamo text;
  v_fecha_anterior timestamptz;
  v_nueva_fecha timestamptz;
  v_renovacion_id uuid;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Debes iniciar sesión para solicitar una renovación.';
  end if;

  if p_prestamo_id is null then
    raise exception 'No se recibió el préstamo que deseas renovar.';
  end if;

  -- Verifica que la cuenta corresponda a un ciudadano activo.
  select c.id
  into v_ciudadano_id
  from public.biblioteca_ciudadanos as c
  where c.auth_user_id = v_auth_user_id
    and c.estado_cuenta = 'activo'
  limit 1;

  if v_ciudadano_id is null then
    raise exception 'No se encontró un perfil ciudadano activo para tu cuenta.';
  end if;

  -- Verifica que el préstamo pertenezca al ciudadano y siga vigente.
  select
    p.estado_prestamo,
    p.fecha_maxima_devolucion
  into
    v_estado_prestamo,
    v_fecha_anterior
  from public.biblioteca_prestamos as p
  where p.id = p_prestamo_id
    and p.ciudadano_id = v_ciudadano_id
    and p.fecha_devolucion is null
  for update;

  if not found then
    raise exception 'No se encontró un préstamo activo asociado a tu cuenta.';
  end if;

  if v_estado_prestamo not in ('activo', 'renovado') then
    raise exception 'Este préstamo no se encuentra disponible para renovación.';
  end if;

  if v_fecha_anterior < now() then
    raise exception 'No es posible renovar un préstamo que ya venció.';
  end if;

  -- Evita solicitudes duplicadas mientras exista una pendiente.
  if exists (
    select 1
    from public.biblioteca_renovaciones as r
    where r.prestamo_id = p_prestamo_id
      and r.estado_renovacion = 'pendiente_revision'
  ) then
    raise exception 'Ya tienes una solicitud de renovación pendiente para este préstamo.';
  end if;

  -- Se propone ampliar 7 días desde la fecha máxima actual.
  v_nueva_fecha := v_fecha_anterior + interval '7 days';

  insert into public.biblioteca_renovaciones (
    prestamo_id,
    fecha_anterior_devolucion,
    nueva_fecha_devolucion,
    estado_renovacion
  )
  values (
    p_prestamo_id,
    v_fecha_anterior,
    v_nueva_fecha,
    'pendiente_revision'
  )
  returning id into v_renovacion_id;

  return query
  select
    v_renovacion_id,
    'pendiente_revision'::text,
    v_fecha_anterior,
    v_nueva_fecha;
end;
$$;


ALTER FUNCTION "public"."solicitar_renovacion_ciudadano"("p_prestamo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_carnet_comerciante"("p_token" "uuid") RETURNS TABLE("encontrado" boolean, "valido" boolean, "estado" "text", "comerciante" "text", "dni_mostrado" "text", "autorizacion" "text", "anio" "text", "giro" "text", "tipo_comercio" "text", "ubicacion" "text", "fecha_expedicion" "date", "fecha_caducidad" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH carnet AS (
    SELECT
      ca.nombres::text AS nombres,
      ca.apellidos::text AS apellidos,

      CASE
        WHEN length(regexp_replace(coalesce(ca.dni, ''), '[^0-9A-Za-z]', '', 'g')) >= 4
        THEN
          repeat(
            '*',
            greatest(
              length(regexp_replace(coalesce(ca.dni, ''), '[^0-9A-Za-z]', '', 'g')) - 4,
              0
            )
          )
          ||
          right(
            regexp_replace(coalesce(ca.dni, ''), '[^0-9A-Za-z]', '', 'g'),
            4
          )
        ELSE '****'
      END::text AS dni_mostrado,

      COALESCE(
        NULLIF(ca.numero_autorizacion_temporal::text, ''),
        NULLIF(ca.numero_autorizacion::text, ''),
        '-'
      )::text AS autorizacion,

      ca.anio::text AS anio,
      ca.giro::text AS giro,
      ca.tipo_comercio::text AS tipo_comercio,
      ca.ubicacion::text AS ubicacion,
      ca.fecha_expedicion::date AS fecha_expedicion,
      ca.fecha_caducidad::date AS fecha_caducidad,

      CASE
        WHEN upper(
          coalesce(ca.nombres, '') || ' ' || coalesce(ca.apellidos, '')
        ) LIKE '%ANULADO%'
        OR upper(
          coalesce(ca.nombres, '') || ' ' || coalesce(ca.apellidos, '')
        ) LIKE '%ANULADA%'
          THEN 'ANULADO'

        WHEN ca.fecha_caducidad IS NOT NULL
          AND ca.fecha_caducidad < current_date
          THEN 'VENCIDO'

        ELSE 'VIGENTE'
      END::text AS estado

    FROM public.comercios_ambulatorios ca
    WHERE ca.qr_token = p_token
    LIMIT 1
  )

  SELECT
    true AS encontrado,
    (c.estado = 'VIGENTE') AS valido,
    c.estado,
    trim(c.nombres || ' ' || c.apellidos)::text AS comerciante,
    c.dni_mostrado,
    c.autorizacion,
    c.anio,
    c.giro,
    c.tipo_comercio,
    c.ubicacion,
    c.fecha_expedicion,
    c.fecha_caducidad
  FROM carnet c

  UNION ALL

  SELECT
    false,
    false,
    'NO_ENCONTRADO'::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::date,
    NULL::date
  WHERE NOT EXISTS (
    SELECT 1
    FROM carnet
  )

  LIMIT 1;
$$;


ALTER FUNCTION "public"."verificar_carnet_comerciante"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_certificado_evento"("p_token" "uuid") RETURNS TABLE("encontrado" boolean, "valido" boolean, "participante" "text", "codigo_evento" integer, "evento_nombre" "text", "evento_fecha" "date", "area_responsable" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH certificado AS (
    SELECT
      ea.nombre_snapshot::text AS participante,
      ea.codigo_evento::integer AS codigo_evento,
      e.nombre::text AS evento_nombre,
      e.fecha::date AS evento_fecha,
      e.area_responsable::text AS area_responsable
    FROM public.evento_asistencias ea
    INNER JOIN public.eventos e
      ON e.id = ea.evento_id
    WHERE ea.qr_token = p_token
    LIMIT 1
  )

  SELECT
    true,
    true,
    c.participante,
    c.codigo_evento,
    c.evento_nombre,
    c.evento_fecha,
    c.area_responsable
  FROM certificado c

  UNION ALL

  SELECT
    false,
    false,
    NULL::text,
    NULL::integer,
    NULL::text,
    NULL::date,
    NULL::text
  WHERE NOT EXISTS (
    SELECT 1 FROM certificado
  )

  LIMIT 1;
$$;


ALTER FUNCTION "public"."verificar_certificado_evento"("p_token" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_ciudadanos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "dni" "text" NOT NULL,
    "nombres" "text" NOT NULL,
    "apellidos" "text" NOT NULL,
    "correo" "text" NOT NULL,
    "telefono" "text",
    "direccion" "text",
    "ocupacion" "text",
    "fecha_nacimiento" "date",
    "estado_cuenta" "text" DEFAULT 'activo'::"text" NOT NULL,
    "clave_hash" "text" DEFAULT 'gestionado_por_supabase_auth'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "biblioteca_ciudadanos_dni_check" CHECK (("dni" ~ '^[0-9]{8}$'::"text")),
    CONSTRAINT "biblioteca_ciudadanos_estado_cuenta_check" CHECK (("estado_cuenta" = ANY (ARRAY['activo'::"text", 'suspendido'::"text", 'inactivo'::"text"])))
);


ALTER TABLE "public"."biblioteca_ciudadanos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_incidencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prestamo_id" "uuid",
    "ciudadano_id" "uuid",
    "libro_id" "uuid",
    "tipo_incidencia" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "estado_incidencia" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "fecha_incidencia" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_regularizacion" timestamp with time zone,
    "observacion_regularizacion" "text",
    "usuario_registro" "text",
    "usuario_regularizacion" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "biblioteca_incidencias_estado_incidencia_check" CHECK (("estado_incidencia" = ANY (ARRAY['pendiente'::"text", 'regularizada'::"text", 'anulada'::"text"]))),
    CONSTRAINT "biblioteca_incidencias_tipo_incidencia_check" CHECK (("tipo_incidencia" = ANY (ARRAY['deterioro'::"text", 'maltrato'::"text", 'perdida'::"text", 'devolucion_fuera_plazo'::"text", 'otro'::"text"])))
);


ALTER TABLE "public"."biblioteca_incidencias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_libros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text",
    "titulo" "text" NOT NULL,
    "autor" "text",
    "editorial" "text",
    "tomo" "text",
    "valor_referencial" numeric(10,2),
    "usuario_registro" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "clasificacion" "text",
    "estado" "text" DEFAULT 'disponible'::"text",
    "observaciones" "text",
    CONSTRAINT "biblioteca_libros_estado_check" CHECK (("estado" = ANY (ARRAY['disponible'::"text", 'reservado'::"text", 'en_prestamo'::"text", 'no_disponible'::"text"])))
);


ALTER TABLE "public"."biblioteca_libros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_libros_backup_base_2026_06_16" (
    "id" "uuid",
    "codigo" "text",
    "titulo" "text",
    "autor" "text",
    "editorial" "text",
    "tomo" "text",
    "valor_referencial" numeric(10,2),
    "usuario_registro" "text",
    "created_at" timestamp with time zone,
    "clasificacion" "text",
    "estado" "text",
    "observaciones" "text"
);


ALTER TABLE "public"."biblioteca_libros_backup_base_2026_06_16" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_prestamos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "solicitud_id" "uuid",
    "ciudadano_id" "uuid" NOT NULL,
    "libro_id" "uuid" NOT NULL,
    "fecha_prestamo" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_maxima_devolucion" timestamp with time zone NOT NULL,
    "fecha_devolucion" timestamp with time zone,
    "estado_prestamo" "text" DEFAULT 'activo'::"text" NOT NULL,
    "estado_fisico_devolucion" "text",
    "observacion_devolucion" "text",
    "usuario_registro" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "biblioteca_prestamos_estado_fisico_devolucion_check" CHECK ((("estado_fisico_devolucion" IS NULL) OR ("estado_fisico_devolucion" = ANY (ARRAY['bueno'::"text", 'deteriorado'::"text", 'maltrato'::"text", 'perdida'::"text"])))),
    CONSTRAINT "biblioteca_prestamos_estado_prestamo_check" CHECK (("estado_prestamo" = ANY (ARRAY['activo'::"text", 'renovado'::"text", 'devolucion_atrasada'::"text", 'finalizado'::"text", 'finalizado_con_incidencia'::"text"])))
);


ALTER TABLE "public"."biblioteca_prestamos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_renovaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prestamo_id" "uuid" NOT NULL,
    "fecha_solicitud" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_anterior_devolucion" timestamp with time zone NOT NULL,
    "nueva_fecha_devolucion" timestamp with time zone NOT NULL,
    "estado_renovacion" "text" DEFAULT 'pendiente_revision'::"text" NOT NULL,
    "motivo_rechazo" "text",
    "fecha_revision" timestamp with time zone,
    "usuario_revision" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "biblioteca_renovaciones_estado_renovacion_check" CHECK (("estado_renovacion" = ANY (ARRAY['pendiente_revision'::"text", 'aprobada'::"text", 'rechazada'::"text", 'cancelada'::"text"])))
);


ALTER TABLE "public"."biblioteca_renovaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biblioteca_solicitudes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo_solicitud" "text" NOT NULL,
    "ciudadano_id" "uuid" NOT NULL,
    "libro_id" "uuid" NOT NULL,
    "fecha_solicitud" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_recojo_solicitada" "date",
    "estado_solicitud" "text" DEFAULT 'pendiente_revision'::"text" NOT NULL,
    "compromiso_aceptado" boolean DEFAULT false NOT NULL,
    "fecha_aprobacion" timestamp with time zone,
    "fecha_limite_recojo" timestamp with time zone,
    "motivo_rechazo" "text",
    "observaciones" "text",
    "usuario_revision" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "biblioteca_solicitudes_estado_solicitud_check" CHECK (("estado_solicitud" = ANY (ARRAY['pendiente_revision'::"text", 'aprobada'::"text", 'rechazada'::"text", 'cancelada'::"text", 'atendida'::"text"])))
);


ALTER TABLE "public"."biblioteca_solicitudes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comercio_anios" (
    "anio" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "comercio_anios_formato" CHECK (("anio" ~ '^[0-9]{4}$'::"text"))
);


ALTER TABLE "public"."comercio_anios" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."comercios_aut_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."comercios_aut_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comercios_ambulatorios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_autorizacion" "text" DEFAULT "lpad"(("nextval"('"public"."comercios_aut_seq"'::"regclass"))::"text", 3, '0'::"text") NOT NULL,
    "nombres" "text" NOT NULL,
    "apellidos" "text" NOT NULL,
    "giro" "text" NOT NULL,
    "ubicacion" "text" NOT NULL,
    "tipo_comercio" "text" NOT NULL,
    "turno" "text" NOT NULL,
    "domicilio" "text" NOT NULL,
    "dni" "text" NOT NULL,
    "fecha_expedicion" "date" NOT NULL,
    "fecha_caducidad" "date" NOT NULL,
    "horario" "text" NOT NULL,
    "qr_code_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "telefono" "text",
    "correlativo" integer NOT NULL,
    "numero_autorizacion_temporal" "text",
    "usuario_registro" "text",
    "anio" "text" DEFAULT '2025'::"text",
    "correo" "text",
    "qr_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "es_privado" boolean DEFAULT false NOT NULL,
    "creado_por_id" "uuid",
    CONSTRAINT "comercios_ambulatorios_dni_check" CHECK (("dni" ~ '^[0-9]{8,9}$|^[A-Z0-9]{6,9}$'::"text")),
    CONSTRAINT "comercios_ambulatorios_tipo_comercio_check" CHECK (("tipo_comercio" = ANY (ARRAY['ESTÁTICO'::"text", 'MÓVIL'::"text"]))),
    CONSTRAINT "comercios_ambulatorios_turno_check" CHECK (("turno" = ANY (ARRAY['MAÑANA'::"text", 'TARDE'::"text", 'NOCHE'::"text", 'MAÑANA-TARDE'::"text", 'TARDE-NOCHE'::"text", 'MAÑANA-TARDE-NOCHE'::"text"])))
);


ALTER TABLE "public"."comercios_ambulatorios" OWNER TO "postgres";


ALTER TABLE "public"."comercios_ambulatorios" ALTER COLUMN "correlativo" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."comercios_ambulatorios_correlativo_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."comercios_establecidos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nro_licencia" "text",
    "nro_expediente" "text",
    "ruc" "text",
    "razon_social" "text",
    "nombre_comercial" "text",
    "giro" "text",
    "categoria_horario" "text",
    "direccion" "text",
    "zonificacion" "text",
    "area_local" numeric,
    "aforo" integer,
    "horario_atencion" "text",
    "fecha_emision" "date",
    "fecha_vencimiento" "date",
    "telefono" "text",
    "representante_legal" "text",
    "dni_representante" "text",
    "certificado_url" "text",
    "usuario_registro" "text",
    "nro_resolucion" "text",
    "fecha_resolucion" "date",
    "anio" "text" DEFAULT '2025'::"text",
    "correo" "text"
);


ALTER TABLE "public"."comercios_establecidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evento_asistencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evento_id" "uuid" NOT NULL,
    "origen_registro_id" "text",
    "codigo_snapshot" "text",
    "documento_snapshot" "text",
    "nombre_snapshot" "text" NOT NULL,
    "detalle_snapshot" "text",
    "ubicacion_snapshot" "text",
    "asistio" boolean DEFAULT false NOT NULL,
    "marcado_por" "text",
    "marcado_en" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origen_snapshot" "text",
    "anio_origen" "text",
    "fuentes_snapshot" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "es_manual" boolean DEFAULT false NOT NULL,
    "dedupe_key" "text",
    "codigo_evento" integer,
    "qr_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "evento_asistencias_codigo_evento_positivo" CHECK ((("codigo_evento" IS NULL) OR ("codigo_evento" > 0))),
    CONSTRAINT "evento_asistencias_origen_snapshot_check" CHECK ((("origen_snapshot" IS NULL) OR ("origen_snapshot" = ANY (ARRAY['AMBULATORIOS'::"text", 'ESTABLECIDOS'::"text", 'MANUAL'::"text"]))))
);


ALTER TABLE "public"."evento_asistencias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evento_fuentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evento_id" "uuid" NOT NULL,
    "origen" "text" NOT NULL,
    "anio" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evento_fuentes_origen_check" CHECK (("origen" = ANY (ARRAY['AMBULATORIOS'::"text", 'ESTABLECIDOS'::"text"])))
);


ALTER TABLE "public"."evento_fuentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eventos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "fecha" "date" NOT NULL,
    "origen" "text",
    "anio" "text",
    "creado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "area_responsable" "text" DEFAULT 'COMERCIALIZACION'::"text" NOT NULL,
    CONSTRAINT "eventos_area_responsable_check" CHECK (("area_responsable" = ANY (ARRAY['COMERCIALIZACION'::"text", 'DEFENSA_CIVIL'::"text"]))),
    CONSTRAINT "eventos_origen_check" CHECK (("origen" = ANY (ARRAY['AMBULATORIOS'::"text", 'ESTABLECIDOS'::"text"])))
);


ALTER TABLE "public"."eventos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventario_informatica" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unidad_organica" "text",
    "oficina_especifica" "text",
    "codigo_contable" "text",
    "codigo_patrimonial" "text",
    "denominacion" "text" NOT NULL,
    "marca" "text" NOT NULL,
    "modelo" "text" NOT NULL,
    "tipo" "text",
    "color" "text" NOT NULL,
    "serie" "text" NOT NULL,
    "medida" "text",
    "estado" "text" NOT NULL,
    "usuario_registro" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "observaciones" "text"
);


ALTER TABLE "public"."inventario_informatica" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'visor'::"text",
    "area" "text" DEFAULT 'COMERCIALIZACION'::"text",
    "ambulatorios_privados" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'visor'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_bus_escolar_backup_2026_05_26" (
    "id" "uuid",
    "nombre_alumno" "text",
    "dni_alumno" "text",
    "edad" integer,
    "sexo" "text",
    "colegio" "text",
    "nombre_apoderado" "text",
    "telefono_apoderado" "text",
    "dni_apoderado" "text",
    "direccion" "text",
    "usuario_registro" "text",
    "created_at" timestamp with time zone,
    "codigo" "text",
    "foto_url" "text",
    "activo" boolean,
    "notas" "text"
);


ALTER TABLE "public"."social_bus_escolar_backup_2026_05_26" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vacaciones_alumnos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nombre_completo_nino" "text" NOT NULL,
    "edad" integer,
    "celular_nino" "text",
    "nombre_apoderado" "text" NOT NULL,
    "celular_apoderado" "text" NOT NULL,
    "sabe_opcion" "text" DEFAULT 'NINGUNO'::"text",
    "usuario_registro" "text",
    "polo_entregado" boolean DEFAULT false,
    "foto_entrega_url" "text",
    CONSTRAINT "vacaciones_alumnos_sabe_opcion_check" CHECK (("sabe_opcion" = ANY (ARRAY['SABE COAR'::"text", 'SABE BECA 18'::"text", 'NINGUNO'::"text"])))
);


ALTER TABLE "public"."vacaciones_alumnos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vacaciones_inscripciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alumno_id" "uuid",
    "taller_id" "uuid"
);


ALTER TABLE "public"."vacaciones_inscripciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vacaciones_talleres" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL
);


ALTER TABLE "public"."vacaciones_talleres" OWNER TO "postgres";


ALTER TABLE ONLY "public"."biblioteca_ciudadanos"
    ADD CONSTRAINT "biblioteca_ciudadanos_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."biblioteca_ciudadanos"
    ADD CONSTRAINT "biblioteca_ciudadanos_correo_key" UNIQUE ("correo");



ALTER TABLE ONLY "public"."biblioteca_ciudadanos"
    ADD CONSTRAINT "biblioteca_ciudadanos_dni_key" UNIQUE ("dni");



ALTER TABLE ONLY "public"."biblioteca_ciudadanos"
    ADD CONSTRAINT "biblioteca_ciudadanos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biblioteca_incidencias"
    ADD CONSTRAINT "biblioteca_incidencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biblioteca_libros"
    ADD CONSTRAINT "biblioteca_libros_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."biblioteca_libros"
    ADD CONSTRAINT "biblioteca_libros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biblioteca_prestamos"
    ADD CONSTRAINT "biblioteca_prestamos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biblioteca_prestamos"
    ADD CONSTRAINT "biblioteca_prestamos_solicitud_id_key" UNIQUE ("solicitud_id");



ALTER TABLE ONLY "public"."biblioteca_renovaciones"
    ADD CONSTRAINT "biblioteca_renovaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biblioteca_solicitudes"
    ADD CONSTRAINT "biblioteca_solicitudes_codigo_solicitud_key" UNIQUE ("codigo_solicitud");



ALTER TABLE ONLY "public"."biblioteca_solicitudes"
    ADD CONSTRAINT "biblioteca_solicitudes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comercio_anios"
    ADD CONSTRAINT "comercio_anios_pkey" PRIMARY KEY ("anio");



ALTER TABLE ONLY "public"."comercios_ambulatorios"
    ADD CONSTRAINT "comercios_ambulatorios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comercios_establecidos"
    ADD CONSTRAINT "comercios_establecidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evento_asistencias"
    ADD CONSTRAINT "evento_asistencias_evento_id_origen_registro_id_key" UNIQUE ("evento_id", "origen_registro_id");



ALTER TABLE ONLY "public"."evento_asistencias"
    ADD CONSTRAINT "evento_asistencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evento_fuentes"
    ADD CONSTRAINT "evento_fuentes_evento_id_origen_anio_key" UNIQUE ("evento_id", "origen", "anio");



ALTER TABLE ONLY "public"."evento_fuentes"
    ADD CONSTRAINT "evento_fuentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eventos"
    ADD CONSTRAINT "eventos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventario_informatica"
    ADD CONSTRAINT "inventario_informatica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_bus_escolar"
    ADD CONSTRAINT "social_bus_escolar_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."social_bus_escolar"
    ADD CONSTRAINT "social_bus_escolar_dni_alumno_key" UNIQUE ("dni_alumno");



ALTER TABLE ONLY "public"."social_bus_escolar"
    ADD CONSTRAINT "social_bus_escolar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comercios_establecidos"
    ADD CONSTRAINT "unique_licencia_per_anio" UNIQUE ("nro_licencia", "anio");



ALTER TABLE ONLY "public"."comercios_ambulatorios"
    ADD CONSTRAINT "unique_numero_per_anio" UNIQUE ("numero_autorizacion", "anio");



ALTER TABLE ONLY "public"."vacaciones_alumnos"
    ADD CONSTRAINT "vacaciones_alumnos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vacaciones_inscripciones"
    ADD CONSTRAINT "vacaciones_inscripciones_alumno_id_taller_id_key" UNIQUE ("alumno_id", "taller_id");



ALTER TABLE ONLY "public"."vacaciones_inscripciones"
    ADD CONSTRAINT "vacaciones_inscripciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vacaciones_talleres"
    ADD CONSTRAINT "vacaciones_talleres_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."vacaciones_talleres"
    ADD CONSTRAINT "vacaciones_talleres_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "comercios_ambulatorios_qr_token_uidx" ON "public"."comercios_ambulatorios" USING "btree" ("qr_token");



CREATE INDEX "idx_biblioteca_ciudadanos_auth_user_id" ON "public"."biblioteca_ciudadanos" USING "btree" ("auth_user_id");



CREATE INDEX "idx_biblioteca_ciudadanos_dni" ON "public"."biblioteca_ciudadanos" USING "btree" ("dni");



CREATE INDEX "idx_biblioteca_incidencias_estado" ON "public"."biblioteca_incidencias" USING "btree" ("estado_incidencia");



CREATE INDEX "idx_biblioteca_incidencias_prestamo" ON "public"."biblioteca_incidencias" USING "btree" ("prestamo_id");



CREATE INDEX "idx_biblioteca_incidencias_tipo" ON "public"."biblioteca_incidencias" USING "btree" ("tipo_incidencia");



CREATE INDEX "idx_biblioteca_libros_clasificacion" ON "public"."biblioteca_libros" USING "btree" ("clasificacion");



CREATE INDEX "idx_biblioteca_libros_codigo" ON "public"."biblioteca_libros" USING "btree" ("codigo");



CREATE INDEX "idx_biblioteca_libros_estado" ON "public"."biblioteca_libros" USING "btree" ("estado");



CREATE INDEX "idx_biblioteca_prestamos_ciudadano" ON "public"."biblioteca_prestamos" USING "btree" ("ciudadano_id");



CREATE INDEX "idx_biblioteca_prestamos_estado" ON "public"."biblioteca_prestamos" USING "btree" ("estado_prestamo");



CREATE INDEX "idx_biblioteca_prestamos_libro" ON "public"."biblioteca_prestamos" USING "btree" ("libro_id");



CREATE INDEX "idx_biblioteca_renovaciones_estado" ON "public"."biblioteca_renovaciones" USING "btree" ("estado_renovacion");



CREATE INDEX "idx_biblioteca_renovaciones_prestamo" ON "public"."biblioteca_renovaciones" USING "btree" ("prestamo_id");



CREATE INDEX "idx_biblioteca_solicitudes_ciudadano" ON "public"."biblioteca_solicitudes" USING "btree" ("ciudadano_id");



CREATE INDEX "idx_biblioteca_solicitudes_estado" ON "public"."biblioteca_solicitudes" USING "btree" ("estado_solicitud");



CREATE INDEX "idx_biblioteca_solicitudes_libro" ON "public"."biblioteca_solicitudes" USING "btree" ("libro_id");



CREATE INDEX "idx_comercios_dni" ON "public"."comercios_ambulatorios" USING "btree" ("dni");



CREATE INDEX "idx_comercios_numero_autorizacion" ON "public"."comercios_ambulatorios" USING "btree" ("numero_autorizacion");



CREATE INDEX "idx_evento_asistencias_estado" ON "public"."evento_asistencias" USING "btree" ("evento_id", "asistio");



CREATE INDEX "idx_evento_asistencias_evento" ON "public"."evento_asistencias" USING "btree" ("evento_id");



CREATE INDEX "idx_evento_fuentes_evento" ON "public"."evento_fuentes" USING "btree" ("evento_id");



CREATE INDEX "idx_eventos_area_responsable" ON "public"."eventos" USING "btree" ("area_responsable");



CREATE INDEX "idx_eventos_fecha" ON "public"."eventos" USING "btree" ("fecha" DESC);



CREATE INDEX "idx_social_bus_escolar_nivel_educativo" ON "public"."social_bus_escolar" USING "btree" ("nivel_educativo") WHERE ("nivel_educativo" IS NOT NULL);



CREATE UNIQUE INDEX "uq_evento_asistencias_codigo_evento" ON "public"."evento_asistencias" USING "btree" ("evento_id", "codigo_evento");



CREATE UNIQUE INDEX "uq_evento_asistencias_qr_token" ON "public"."evento_asistencias" USING "btree" ("qr_token");



-- LIMPIADO ANTES DE PUBLICAR: la URL del webhook de Make es un marcador; la real no se guarda en el repo.
CREATE OR REPLACE TRIGGER "Enviar a sheet" AFTER INSERT OR DELETE OR UPDATE ON "public"."comercios_ambulatorios" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://hook.REEMPLAZAR.make.com/URL-DEL-WEBHOOK', 'POST', '{"Content-type":"application/json"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "trg_biblioteca_ciudadanos_updated_at" BEFORE UPDATE ON "public"."biblioteca_ciudadanos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_biblioteca_incidencias_updated_at" BEFORE UPDATE ON "public"."biblioteca_incidencias" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_biblioteca_prestamos_updated_at" BEFORE UPDATE ON "public"."biblioteca_prestamos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_biblioteca_renovaciones_updated_at" BEFORE UPDATE ON "public"."biblioteca_renovaciones" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_biblioteca_solicitudes_updated_at" BEFORE UPDATE ON "public"."biblioteca_solicitudes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_liberar_libro_solicitud_cerrada" AFTER UPDATE OF "estado_solicitud" ON "public"."biblioteca_solicitudes" FOR EACH ROW EXECUTE FUNCTION "public"."liberar_libro_si_solicitud_cerrada"();



CREATE OR REPLACE TRIGGER "trg_preparar_comercio_ambulatorio" BEFORE INSERT OR UPDATE ON "public"."comercios_ambulatorios" FOR EACH ROW EXECUTE FUNCTION "public"."preparar_comercio_ambulatorio"();



CREATE OR REPLACE TRIGGER "update_comercios_ambulatorios_updated_at" BEFORE UPDATE ON "public"."comercios_ambulatorios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."biblioteca_ciudadanos"
    ADD CONSTRAINT "biblioteca_ciudadanos_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."biblioteca_incidencias"
    ADD CONSTRAINT "biblioteca_incidencias_ciudadano_id_fkey" FOREIGN KEY ("ciudadano_id") REFERENCES "public"."biblioteca_ciudadanos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_incidencias"
    ADD CONSTRAINT "biblioteca_incidencias_libro_id_fkey" FOREIGN KEY ("libro_id") REFERENCES "public"."biblioteca_libros"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_incidencias"
    ADD CONSTRAINT "biblioteca_incidencias_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "public"."biblioteca_prestamos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_prestamos"
    ADD CONSTRAINT "biblioteca_prestamos_ciudadano_id_fkey" FOREIGN KEY ("ciudadano_id") REFERENCES "public"."biblioteca_ciudadanos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_prestamos"
    ADD CONSTRAINT "biblioteca_prestamos_libro_id_fkey" FOREIGN KEY ("libro_id") REFERENCES "public"."biblioteca_libros"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_prestamos"
    ADD CONSTRAINT "biblioteca_prestamos_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "public"."biblioteca_solicitudes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_renovaciones"
    ADD CONSTRAINT "biblioteca_renovaciones_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "public"."biblioteca_prestamos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_solicitudes"
    ADD CONSTRAINT "biblioteca_solicitudes_ciudadano_id_fkey" FOREIGN KEY ("ciudadano_id") REFERENCES "public"."biblioteca_ciudadanos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."biblioteca_solicitudes"
    ADD CONSTRAINT "biblioteca_solicitudes_libro_id_fkey" FOREIGN KEY ("libro_id") REFERENCES "public"."biblioteca_libros"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evento_asistencias"
    ADD CONSTRAINT "evento_asistencias_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evento_fuentes"
    ADD CONSTRAINT "evento_fuentes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."vacaciones_inscripciones"
    ADD CONSTRAINT "vacaciones_inscripciones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "public"."vacaciones_alumnos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vacaciones_inscripciones"
    ADD CONSTRAINT "vacaciones_inscripciones_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "public"."vacaciones_talleres"("id") ON DELETE CASCADE;



CREATE POLICY "BASE admin actualiza ciudadanos" ON "public"."biblioteca_ciudadanos" FOR UPDATE TO "authenticated" USING ("public"."es_operador_base"()) WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin actualiza incidencias" ON "public"."biblioteca_incidencias" FOR UPDATE TO "authenticated" USING ("public"."es_operador_base"()) WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin actualiza prestamos" ON "public"."biblioteca_prestamos" FOR UPDATE TO "authenticated" USING ("public"."es_operador_base"()) WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin actualiza renovaciones" ON "public"."biblioteca_renovaciones" FOR UPDATE TO "authenticated" USING ("public"."es_operador_base"()) WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin actualiza solicitudes" ON "public"."biblioteca_solicitudes" FOR UPDATE TO "authenticated" USING ("public"."es_operador_base"()) WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin inserta incidencias" ON "public"."biblioteca_incidencias" FOR INSERT TO "authenticated" WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin inserta prestamos" ON "public"."biblioteca_prestamos" FOR INSERT TO "authenticated" WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE admin lee ciudadanos" ON "public"."biblioteca_ciudadanos" FOR SELECT TO "authenticated" USING ("public"."es_admin_base"());



CREATE POLICY "BASE admin lee incidencias" ON "public"."biblioteca_incidencias" FOR SELECT TO "authenticated" USING ("public"."es_admin_base"());



CREATE POLICY "BASE admin lee prestamos" ON "public"."biblioteca_prestamos" FOR SELECT TO "authenticated" USING ("public"."es_admin_base"());



CREATE POLICY "BASE admin lee renovaciones" ON "public"."biblioteca_renovaciones" FOR SELECT TO "authenticated" USING ("public"."es_admin_base"());



CREATE POLICY "BASE admin lee solicitudes" ON "public"."biblioteca_solicitudes" FOR SELECT TO "authenticated" USING ("public"."es_admin_base"());



CREATE POLICY "BASE ciudadano actualiza su perfil" ON "public"."biblioteca_ciudadanos" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "BASE ciudadano cancela solicitud pendiente" ON "public"."biblioteca_solicitudes" FOR UPDATE TO "authenticated" USING ((("estado_solicitud" = 'pendiente_revision'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."biblioteca_ciudadanos" "c"
  WHERE (("c"."id" = "biblioteca_solicitudes"."ciudadano_id") AND ("c"."auth_user_id" = "auth"."uid"())))))) WITH CHECK ((("estado_solicitud" = 'cancelada'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."biblioteca_ciudadanos" "c"
  WHERE (("c"."id" = "biblioteca_solicitudes"."ciudadano_id") AND ("c"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "BASE ciudadano ve su perfil" ON "public"."biblioteca_ciudadanos" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "BASE ciudadano ve sus incidencias" ON "public"."biblioteca_incidencias" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."biblioteca_prestamos" "p"
     JOIN "public"."biblioteca_ciudadanos" "c" ON (("c"."id" = "p"."ciudadano_id")))
  WHERE (("p"."id" = "biblioteca_incidencias"."prestamo_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "BASE ciudadano ve sus prestamos" ON "public"."biblioteca_prestamos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."biblioteca_ciudadanos" "c"
  WHERE (("c"."id" = "biblioteca_prestamos"."ciudadano_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "BASE ciudadano ve sus renovaciones" ON "public"."biblioteca_renovaciones" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."biblioteca_prestamos" "p"
     JOIN "public"."biblioteca_ciudadanos" "c" ON (("c"."id" = "p"."ciudadano_id")))
  WHERE (("p"."id" = "biblioteca_renovaciones"."prestamo_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "BASE ciudadano ve sus solicitudes" ON "public"."biblioteca_solicitudes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."biblioteca_ciudadanos" "c"
  WHERE (("c"."id" = "biblioteca_solicitudes"."ciudadano_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "BASE lectura publica libros" ON "public"."biblioteca_libros" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "BASE operador actualiza libros" ON "public"."biblioteca_libros" FOR UPDATE TO "authenticated" USING ("public"."es_operador_base"()) WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "BASE operador elimina libros" ON "public"."biblioteca_libros" FOR DELETE TO "authenticated" USING ("public"."es_operador_base"());



CREATE POLICY "BASE operador inserta libros" ON "public"."biblioteca_libros" FOR INSERT TO "authenticated" WITH CHECK ("public"."es_operador_base"());



CREATE POLICY "Escribir Alumnos" ON "public"."vacaciones_alumnos" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."area" = 'DESARROLLO_SOCIAL'::"text") OR ("profiles"."area" = 'ADMIN'::"text"))))));



CREATE POLICY "Escribir Inscripciones" ON "public"."vacaciones_inscripciones" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."area" = 'DESARROLLO_SOCIAL'::"text") OR ("profiles"."area" = 'ADMIN'::"text"))))));



CREATE POLICY "Escritura admins" ON "public"."comercios_ambulatorios" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Escritura admins establecidos" ON "public"."comercios_establecidos" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Lectura publica" ON "public"."comercios_ambulatorios" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Lectura publica establecidos" ON "public"."comercios_establecidos" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Leer Alumnos" ON "public"."vacaciones_alumnos" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Leer Inscripciones" ON "public"."vacaciones_inscripciones" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Leer Talleres" ON "public"."vacaciones_talleres" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Ver perfiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "ambulatorios_privacidad_delete" ON "public"."comercios_ambulatorios" AS RESTRICTIVE FOR DELETE TO "authenticated" USING (((COALESCE("es_privado", false) = false) OR ("creado_por_id" = "auth"."uid"())));



CREATE POLICY "ambulatorios_privacidad_select" ON "public"."comercios_ambulatorios" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (((COALESCE("es_privado", false) = false) OR ("creado_por_id" = "auth"."uid"())));



CREATE POLICY "ambulatorios_privacidad_update" ON "public"."comercios_ambulatorios" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (((COALESCE("es_privado", false) = false) OR ("creado_por_id" = "auth"."uid"()))) WITH CHECK (((COALESCE("es_privado", false) = false) OR ("creado_por_id" = "auth"."uid"())));



CREATE POLICY "asistencias_delete_admin" ON "public"."evento_asistencias" FOR DELETE TO "authenticated" USING (("public"."sigem_current_user_role"() = 'admin'::"text"));



CREATE POLICY "asistencias_insert_admin_o_operador" ON "public"."evento_asistencias" FOR INSERT TO "authenticated" WITH CHECK ((("public"."sigem_current_user_role"() = 'admin'::"text") OR (("public"."sigem_current_user_role"() = 'operador'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."eventos" "e"
  WHERE (("e"."id" = "evento_asistencias"."evento_id") AND ("e"."area_responsable" = "public"."sigem_current_user_area"())))))));



CREATE POLICY "asistencias_select_por_area" ON "public"."evento_asistencias" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."eventos" "e"
  WHERE (("e"."id" = "evento_asistencias"."evento_id") AND ((COALESCE("public"."sigem_current_user_area"(), ''::"text") <> 'DEFENSA_CIVIL'::"text") OR ("e"."area_responsable" = 'DEFENSA_CIVIL'::"text"))))));



CREATE POLICY "asistencias_update_admin_o_operador" ON "public"."evento_asistencias" FOR UPDATE TO "authenticated" USING ((("public"."sigem_current_user_role"() = 'admin'::"text") OR (("public"."sigem_current_user_role"() = 'operador'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."eventos" "e"
  WHERE (("e"."id" = "evento_asistencias"."evento_id") AND ("e"."area_responsable" = "public"."sigem_current_user_area"()))))))) WITH CHECK ((("public"."sigem_current_user_role"() = 'admin'::"text") OR (("public"."sigem_current_user_role"() = 'operador'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."eventos" "e"
  WHERE (("e"."id" = "evento_asistencias"."evento_id") AND ("e"."area_responsable" = "public"."sigem_current_user_area"())))))));



ALTER TABLE "public"."biblioteca_ciudadanos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biblioteca_incidencias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biblioteca_libros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biblioteca_libros_backup_base_2026_06_16" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biblioteca_prestamos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biblioteca_renovaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biblioteca_solicitudes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comercio_anios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comercio_anios_delete_admin" ON "public"."comercio_anios" FOR DELETE TO "authenticated" USING ("public"."sigem_is_admin"());



CREATE POLICY "comercio_anios_insert_admin" ON "public"."comercio_anios" FOR INSERT TO "authenticated" WITH CHECK ("public"."sigem_is_admin"());



CREATE POLICY "comercio_anios_select_authenticated" ON "public"."comercio_anios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "comercio_anios_update_admin" ON "public"."comercio_anios" FOR UPDATE TO "authenticated" USING ("public"."sigem_is_admin"()) WITH CHECK ("public"."sigem_is_admin"());



ALTER TABLE "public"."comercios_ambulatorios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comercios_establecidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evento_asistencias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evento_fuentes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evento_fuentes_delete_admin" ON "public"."evento_fuentes" FOR DELETE TO "authenticated" USING (("public"."sigem_current_user_role"() = 'admin'::"text"));



CREATE POLICY "evento_fuentes_insert_admin" ON "public"."evento_fuentes" FOR INSERT TO "authenticated" WITH CHECK (("public"."sigem_current_user_role"() = 'admin'::"text"));



CREATE POLICY "evento_fuentes_select_por_area" ON "public"."evento_fuentes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."eventos" "e"
  WHERE (("e"."id" = "evento_fuentes"."evento_id") AND ((COALESCE("public"."sigem_current_user_area"(), ''::"text") <> 'DEFENSA_CIVIL'::"text") OR ("e"."area_responsable" = 'DEFENSA_CIVIL'::"text"))))));



CREATE POLICY "evento_fuentes_update_admin" ON "public"."evento_fuentes" FOR UPDATE TO "authenticated" USING (("public"."sigem_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."sigem_current_user_role"() = 'admin'::"text"));



ALTER TABLE "public"."eventos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eventos_delete_admin" ON "public"."eventos" FOR DELETE TO "authenticated" USING (("public"."sigem_current_user_role"() = 'admin'::"text"));



CREATE POLICY "eventos_insert_admin" ON "public"."eventos" FOR INSERT TO "authenticated" WITH CHECK (("public"."sigem_current_user_role"() = 'admin'::"text"));



CREATE POLICY "eventos_select_por_area" ON "public"."eventos" FOR SELECT TO "authenticated" USING (((COALESCE("public"."sigem_current_user_area"(), ''::"text") <> 'DEFENSA_CIVIL'::"text") OR ("area_responsable" = 'DEFENSA_CIVIL'::"text")));



CREATE POLICY "eventos_update_admin" ON "public"."eventos" FOR UPDATE TO "authenticated" USING (("public"."sigem_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."sigem_current_user_role"() = 'admin'::"text"));









ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_bus_escolar" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_bus_escolar_backup_2026_05_26" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vacaciones_alumnos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vacaciones_inscripciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vacaciones_talleres" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."social_bus_escolar" TO "anon";
GRANT ALL ON TABLE "public"."social_bus_escolar" TO "authenticated";
GRANT ALL ON TABLE "public"."social_bus_escolar" TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_ciudadano_desde_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."crear_ciudadano_desde_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_ciudadano_desde_auth"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_solicitud_reserva_ciudadano"("p_libro_id" "uuid", "p_fecha_recojo_solicitada" "date", "p_observaciones" "text", "p_compromiso_aceptado" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_solicitud_reserva_ciudadano"("p_libro_id" "uuid", "p_fecha_recojo_solicitada" "date", "p_observaciones" "text", "p_compromiso_aceptado" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."crear_solicitud_reserva_ciudadano"("p_libro_id" "uuid", "p_fecha_recojo_solicitada" "date", "p_observaciones" "text", "p_compromiso_aceptado" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_solicitud_reserva_ciudadano"("p_libro_id" "uuid", "p_fecha_recojo_solicitada" "date", "p_observaciones" "text", "p_compromiso_aceptado" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."es_admin_base"() TO "anon";
GRANT ALL ON FUNCTION "public"."es_admin_base"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."es_admin_base"() TO "service_role";



GRANT ALL ON FUNCTION "public"."es_operador_base"() TO "anon";
GRANT ALL ON FUNCTION "public"."es_operador_base"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."es_operador_base"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_siguiente_codigo_biblioteca"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_siguiente_codigo_biblioteca"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_siguiente_codigo_biblioteca"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_siguiente_codigo_bus"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_siguiente_codigo_bus"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_siguiente_codigo_bus"() TO "service_role";



GRANT ALL ON FUNCTION "public"."liberar_libro_si_solicitud_cerrada"() TO "anon";
GRANT ALL ON FUNCTION "public"."liberar_libro_si_solicitud_cerrada"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."liberar_libro_si_solicitud_cerrada"() TO "service_role";



GRANT ALL ON FUNCTION "public"."preparar_comercio_ambulatorio"() TO "anon";
GRANT ALL ON FUNCTION "public"."preparar_comercio_ambulatorio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."preparar_comercio_ambulatorio"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sigem_current_user_area"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sigem_current_user_area"() TO "anon";
GRANT ALL ON FUNCTION "public"."sigem_current_user_area"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sigem_current_user_area"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sigem_current_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sigem_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."sigem_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sigem_current_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sigem_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sigem_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."sigem_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sigem_is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."solicitar_renovacion_ciudadano"("p_prestamo_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."solicitar_renovacion_ciudadano"("p_prestamo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."solicitar_renovacion_ciudadano"("p_prestamo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."solicitar_renovacion_ciudadano"("p_prestamo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."verificar_carnet_comerciante"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verificar_carnet_comerciante"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verificar_carnet_comerciante"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verificar_carnet_comerciante"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."verificar_certificado_evento"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verificar_certificado_evento"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verificar_certificado_evento"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verificar_certificado_evento"("p_token" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_ciudadanos" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_ciudadanos" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_ciudadanos" TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_incidencias" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_incidencias" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_incidencias" TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_libros" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_libros" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_libros" TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_libros_backup_base_2026_06_16" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_libros_backup_base_2026_06_16" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_libros_backup_base_2026_06_16" TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_prestamos" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_prestamos" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_prestamos" TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_renovaciones" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_renovaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_renovaciones" TO "service_role";



GRANT ALL ON TABLE "public"."biblioteca_solicitudes" TO "anon";
GRANT ALL ON TABLE "public"."biblioteca_solicitudes" TO "authenticated";
GRANT ALL ON TABLE "public"."biblioteca_solicitudes" TO "service_role";



GRANT ALL ON TABLE "public"."comercio_anios" TO "anon";
GRANT ALL ON TABLE "public"."comercio_anios" TO "authenticated";
GRANT ALL ON TABLE "public"."comercio_anios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comercios_aut_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comercios_aut_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comercios_aut_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comercios_ambulatorios" TO "anon";
GRANT ALL ON TABLE "public"."comercios_ambulatorios" TO "authenticated";
GRANT ALL ON TABLE "public"."comercios_ambulatorios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comercios_ambulatorios_correlativo_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comercios_ambulatorios_correlativo_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comercios_ambulatorios_correlativo_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comercios_establecidos" TO "anon";
GRANT ALL ON TABLE "public"."comercios_establecidos" TO "authenticated";
GRANT ALL ON TABLE "public"."comercios_establecidos" TO "service_role";



GRANT ALL ON TABLE "public"."evento_asistencias" TO "anon";
GRANT ALL ON TABLE "public"."evento_asistencias" TO "authenticated";
GRANT ALL ON TABLE "public"."evento_asistencias" TO "service_role";



GRANT ALL ON TABLE "public"."evento_fuentes" TO "anon";
GRANT ALL ON TABLE "public"."evento_fuentes" TO "authenticated";
GRANT ALL ON TABLE "public"."evento_fuentes" TO "service_role";



GRANT ALL ON TABLE "public"."eventos" TO "anon";
GRANT ALL ON TABLE "public"."eventos" TO "authenticated";
GRANT ALL ON TABLE "public"."eventos" TO "service_role";



GRANT ALL ON TABLE "public"."inventario_informatica" TO "anon";
GRANT ALL ON TABLE "public"."inventario_informatica" TO "authenticated";
GRANT ALL ON TABLE "public"."inventario_informatica" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."social_bus_escolar_backup_2026_05_26" TO "anon";
GRANT ALL ON TABLE "public"."social_bus_escolar_backup_2026_05_26" TO "authenticated";
GRANT ALL ON TABLE "public"."social_bus_escolar_backup_2026_05_26" TO "service_role";



GRANT ALL ON TABLE "public"."vacaciones_alumnos" TO "anon";
GRANT ALL ON TABLE "public"."vacaciones_alumnos" TO "authenticated";
GRANT ALL ON TABLE "public"."vacaciones_alumnos" TO "service_role";



GRANT ALL ON TABLE "public"."vacaciones_inscripciones" TO "anon";
GRANT ALL ON TABLE "public"."vacaciones_inscripciones" TO "authenticated";
GRANT ALL ON TABLE "public"."vacaciones_inscripciones" TO "service_role";



GRANT ALL ON TABLE "public"."vacaciones_talleres" TO "anon";
GRANT ALL ON TABLE "public"."vacaciones_talleres" TO "authenticated";
GRANT ALL ON TABLE "public"."vacaciones_talleres" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







