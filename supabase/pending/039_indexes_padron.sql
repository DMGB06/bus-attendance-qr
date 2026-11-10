-- =============================================================================
-- 039 (padron) - Indices de busqueda sobre public.social_bus_escolar
-- NO aplicada en produccion. ATENCION: la tabla es del padron SIGEM (compartida). Solo agrega indices, no cambia
-- datos ni columnas, pero REQUIERE AVISAR A TI SIGEM ANTES. Requiere 039_indexes.sql (crea pg_trgm).
-- Sin transaccion a proposito: CREATE INDEX CONCURRENTLY no bloquea las escrituras del padron mientras se construye.
-- Sin estos indices la busqueda de alumnos funciona igual, solo es mas lenta cuando el padron es grande.
--   nombre_alumno: busqueda por %texto% (trigram)
--   lower(codigo) y dni_alumno: busqueda por prefijo (text_pattern_ops); las funciones comparan lower(codigo) LIKE ...
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_padron_nombre_trgm ON public.social_bus_escolar USING gin (nombre_alumno extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_padron_codigo_prefix ON public.social_bus_escolar (lower(codigo) text_pattern_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_padron_dni_prefix ON public.social_bus_escolar (dni_alumno text_pattern_ops);
