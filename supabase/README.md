# Supabase — BusControl QR (MDCA2025)

## Schemas

| Schema | Contenido | ¿Tocar? |
|--------|-----------|---------|
| `public` | `social_bus_escolar`, `vacaciones_*`, `profiles` *(SIGEM — no tocar)* | Solo lectura padrón alumnos |
| `buscontrol` | `app_profiles`, `bus_trips`, … | **Perfiles y operación BusControl** |

## Orden de migraciones

1. `001_create_schema_buscontrol.sql` — CREATE SCHEMA
2. `002_grants_buscontrol.sql` — GRANT permisos
3. `003_move_bus_tables_to_buscontrol.sql` — ALTER TABLE SET SCHEMA (tras TI exponga API)
4. `004_phase0_multirol_base.sql` — Fase 0 multi-rol (sin usuarios chofer/asistenta aún)
5. `005_realtime_attendance.sql` — Realtime roster compartido
6. `006_void_attendance.sql` — RPC anular registro (Fase 2)
7. `007_parent_rls_realtime.sql` — RLS padres + Realtime `student_trip_status`
8. `008_bus_guardians_rls.sql` — RLS catálogo municipal apoderados
9. `009_push_notifications.sql` — Tokens push, preferencias, `guardian_user_ids_for_student`
10. `010_gps_rls.sql` — RLS GPS, Realtime `bus_trips`, purge ubicaciones
11. `011_observability.sql` — Vistas push/offline y `push_failure_count()`
12. `012_security_hardening_rls.sql` — Endurecimiento RLS (Fase A seguridad)
13. `013_security_rpc_operations.sql` — RPCs operaciones críticas (Fase B)
14. `014_security_crew_and_padron.sql` — Crew y padrón (Fase C)
15. `015_phase_d_webhook_hardening.sql` — Webhook push idempotente (Fase D)
16. `016_guardian_students_rpc.sql` — RPC hijos apoderado (`get_my_guardian_students`)
17. `017_operator_activity_history.sql` — RPC historial operador 7 días (**solo lectura**; ver `docs/PLAN-HISTORIAL-OPERADOR.md`)
18. `018_close_trip_active_fix.sql` — `close_trip` sin exigir `trip_date = hoy` (viajes activos colgados)
19. `019_close_trip_operator_permission.sql` — `close_trip` si iniciaste el viaje o asignación en `trip_date`
20. `020_single_bus_pilot_mode.sql` — Piloto 1 bus: auto BUS-01 sin `bus_crew_assignments` diario

## TI municipal (obligatorio antes de paso 3)

**Integrations → Data API → Settings → Exposed schemas** → agregar `buscontrol` + Save.

## Usuarios de prueba

No van en Fase 0. Cuando existan en Auth, usar `seed_users.example.sql`.

## App mobile

Tras mover tablas: `supabase.ts` con clientes `buscontrol` + `public` (Fase 0-A S7).

## Entorno de pruebas local (Docker) - Etapa 1 del web

Reemplaza el flujo de arriba para pruebas. Las migraciones 001-024 ya estan aplicadas en produccion y viven en `migrations_historicas/` (solo referencia, no se ejecutan).

| Ruta | Contenido |
|------|-----------|
| `migrations/0000-0002_*` | Volcado del esquema real de produccion (`public`, `buscontrol`), sin datos. Dividido en 3 por la dependencia circular entre schemas |
| `migrations/025_*` | Rol `administrador` |
| `pending/` | 026 a 040 (más `033_backfill_beneficiaries.sql`, `039_indexes_padron.sql`) y sus rollbacks (`027_rollback.sql` a `040_rollback.sql`, `039_indexes_rollback.sql`, `039_indexes_padron_rollback.sql`): se aplican a mano (la 025 va sola) |
| `functions/guardian-account/` | Edge Function de cuentas de padre (README propio; se prueba con `node supabase/functions/guardian-account/test.mjs`) |
| `tests/` | `etapa1_roles.sql`, `etapa1_extra.sql`, `etapa2_beneficiarios.sql`, `etapa2_apoderados.sql`, `etapa4_cuentas_padre.sql`, `etapa4_ocultar_bajas.sql`, `etapa4_lista_alumnos.sql`, `etapa4_lista_apoderados.sql`, `etapa4_carnets.sql`, `etapa4_dashboard.sql`, `etapa4_auditoria.sql`, `etapa4_roles.sql` (matriz de roles) y `check_duplicados_apoderados.sql` (solo lectura, para producción) |

Pasos: `supabase start` (aplica 0000-0002 y 025) y luego:

    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/026_create_qr_codes_and_admin_audit.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/027_admin_read_padron.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/028_create_bus_beneficiaries.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/029_guardians_admin_rpc.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/030_revoke_guardians_grants.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/031_admin_session_audit.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/032_guardian_accounts.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/033_backfill_beneficiaries.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/033_hide_non_beneficiaries.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/034_admin_list_students.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/035_admin_list_guardians.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/036_admin_cards.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/037_admin_dashboard.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/038_admin_list_audit.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/039_indexes.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/039_indexes_padron.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/pending/040_restrict_guardian_writes.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa1_roles.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa1_extra.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa2_beneficiarios.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa2_apoderados.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_cuentas_padre.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_ocultar_bajas.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_lista_alumnos.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_lista_apoderados.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_carnets.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_dashboard.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_auditoria.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa4_roles.sql

**NUNCA correr `supabase db push` contra produccion**: `migrations/` contiene el esquema base, que en produccion ya existe. En produccion se aplican a mano solo 025 a 040, en ese orden (la carga inicial `033_backfill_beneficiaries.sql` SIEMPRE antes de `033_hide_non_beneficiaries.sql`, y la 033 requiere aviso a TI SIGEM porque toca `public.social_bus_escolar`) y cada una en su ejecucion (previo respaldo y aviso a TI SIGEM por la 027). `039_indexes_padron.sql` toca la tabla compartida del padron (solo agrega indices, con CONCURRENTLY): tambien requiere aviso a TI SIGEM. La 040 requiere confirmar antes que ningun coordinador gestione apoderados desde la app movil.

Las migraciones 021-024 existen pero no estan en la lista de arriba.
