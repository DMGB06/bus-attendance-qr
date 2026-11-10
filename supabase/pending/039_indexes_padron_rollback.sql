-- Rollback de 039 (padron): quita los indices de busqueda del padron.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_padron_nombre_trgm;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_padron_codigo_prefix;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_padron_dni_prefix;
