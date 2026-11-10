# Informe de pruebas por rol: Etapa 2 (base de datos)

Fecha: 2026-11-07. Entorno: Supabase local en Docker (`supabase_db_BusControl`), esquema idéntico a producción, sin datos reales. No se probó en producción.

## Alcance
Pruebas de la base de datos: qué puede hacer cada rol con las tablas y funciones de QR, padrón, beneficiarios y apoderados. Se simula cada rol con `SET LOCAL ROLE` y las claims JWT del usuario.

No cubre: la web (Etapa 5), la API real con login (Etapa 3), Realtime ni la app móvil.

## Cómo se corre
Desde la raíz del repo, en este orden (cada script termina con error si hay alguna prueba fallida):

    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa1_roles.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa1_extra.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa2_beneficiarios.sql
    docker exec -i supabase_db_BusControl psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/etapa2_apoderados.sql

Migraciones necesarias: 025, 026, 027, 028, 029 y 030 aplicadas en el Docker.

## Resultado

| Suite | Pruebas | Pasan | Fallan |
|---|---|---|---|
| etapa1_roles (QR, padrón, roles, anon, auditoría) | 43 | 43 | 0 |
| etapa1_extra (permisos operativos, admin inactivo, perfil sin rol) | 7 | 7 | 0 |
| etapa2_beneficiarios (028) | 36 | 36 | 0 |
| etapa2_apoderados (029 y 030) | 56 | 56 | 0 |
| **Total** | **142** | **142** | **0** |

## Resultado por rol

| Operación | Administrador | Chofer / asistenta / padre / coordinador | Anon |
|---|---|---|---|
| Emitir carnet QR | Sí | No (bloqueado) | No (bloqueado) |
| Reportar carnet perdido | Sí | No (bloqueado) | No (bloqueado) |
| Leer `qr_codes` y auditoría | Sí | No (0 filas o error) | No (error) |
| Dar de alta / baja beneficiario | Sí | No (bloqueado) | No (bloqueado) |
| Leer beneficiarios | Sí | No (0 filas o error) | No (error) |
| Crear, editar, activar/desactivar apoderado | Sí | No (bloqueado) | No (bloqueado) |
| Vincular, marcar principal, desvincular | Sí | No (bloqueado) | No (bloqueado) |
| Leer apoderados y vínculos | Sí | No probado | No (error) |
| INSERT directo en tablas nuevas | Bloqueado | No probado | No probado |
| UPDATE/DELETE directo | Sin efecto (0 filas) o bloqueado | No probado | No probado |
| Leer padrón `social_bus_escolar` | Sí (2 filas) | Chofer, asistenta y coordinador: sí (2). Padre: no (0) | No (error o 0) |
| Leer tablas operativas (viajes, asistencia, unidades, tripulación) | 0 filas o error | No probado | No probado |

## Reglas confirmadas
- Solo el administrador ejecuta funciones de escritura. Los roles móviles y anon reciben "Solo el administrador..." o "permission denied".
- Un administrador inactivo no puede emitir carnets.
- Un perfil sin rol no puede emitir carnets.
- Un administrador no puede cambiar su propio rol: el trigger lo bloquea o el UPDATE no afecta filas.
- Dar de baja un beneficiario no cierra su carnet vigente.
- Un apoderado solo puede tener un principal por alumno, y no se puede marcar principal a un apoderado no vinculado.
- Las funciones internas (`_require_web_admin`) no son ejecutables por anon ni por el administrador.
- La 030 retiró los grants sobrantes: anon no lee ni escribe en `bus_guardians` ni en `bus_student_guardians`.

## Limitaciones
- La lectura de apoderados y vínculos por roles móviles no está en las pruebas. Solo se probaron escrituras.
- La prueba de concurrencia de emisión de carnet no está hecha (ver `errores-conocidos.md`).
- Las pruebas usan datos de prueba (`BU0098`, `BU0099`), no el padrón real.
- Ninguna prueba cubre la web ni la API real con login.

## Pendiente antes de producción
1. Revisar duplicados con `supabase/tests/check_duplicados_apoderados.sql` (última revisión: sin duplicados de DNI, teléfono ni vínculos).
2. Aplicar 025 a 030 en producción, con respaldo previo y en ese orden.
3. Confirmar en Supabase los campos reales de `bus_guardians` y `bus_student_guardians`.
