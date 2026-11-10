-- =============================================================================
-- 025 - Rol administrador para el sistema web
-- NO aplicada. Revisar, respaldar la BD y ejecutar fuera de horario de ruta.
-- Solo toca el schema buscontrol (tipo app_role).
--
-- IMPORTANTE: ejecutar SOLA, en su propia ejecucion (sin BEGIN/COMMIT).
-- PostgreSQL no permite usar un valor de enum recien agregado dentro de la
-- misma transaccion. La 026 y la 027 se ejecutan DESPUES, por separado.
--
-- No cambia ningun permiso existente: is_active_operator() compara contra una
-- lista explicita (chofer, asistenta, coordinador), por lo que el nuevo rol
-- NO obtiene permisos operativos.
--
-- Rollback: PostgreSQL no permite quitar un valor de enum. Si hace falta
-- revertir, basta con no asignar el rol (ver 027_rollback.sql).
-- =============================================================================

ALTER TYPE buscontrol.app_role ADD VALUE IF NOT EXISTS 'administrador';

-- Verificacion (debe listar 5 valores, incluido administrador):
-- SELECT unnest(enum_range(NULL::buscontrol.app_role));
