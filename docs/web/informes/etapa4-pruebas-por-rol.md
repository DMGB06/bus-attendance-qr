# Informe de pruebas por rol y revisión de seguridad: Etapa 4 (panel web, Release 1)

Fecha: 2026-11-09 (actualizado tras la revisión total de rendimiento). Entorno: Supabase local en Docker (`supabase_db_BusControl`) y panel en local (`npm run dev`). Sin datos reales. **No se probó en producción.**

## Alcance
- Base de datos: qué puede hacer cada rol con las funciones y tablas nuevas de la Etapa 4 (migraciones 032 a 040).
- Panel web: pruebas de extremo a extremo de los siete módulos de Release 1 (Acceso, Alumnos, Apoderados, Cuentas de padres, Carnets QR, Dashboard y Auditoría).
- Revisión de seguridad del código web y de la Edge Function `guardian-account`.

No cubre: Release 2 (buses, tripulación, consultas), la app móvil, producción ni pruebas de carga.

## Cómo se corre
Migraciones 025 a 040 aplicadas (la 039 de índices del padrón y la 040 también) en el Docker. Desde la raíz del repo, en este orden (cada script termina con error si hay una prueba fallida):

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

Panel (desde `web/`): `npx vitest run` (unitarias) y `npx playwright test` (E2E). Las E2E de apoderados necesitan `supabase functions serve guardian-account` en otra terminal y las credenciales de prueba en `web/.env.test.local`.

## Resultado

| Suite | Pruebas | Pasan | Fallan |
|---|---|---|---|
| etapa1_roles | 43 | 43 | 0 |
| etapa1_extra | 7 | 7 | 0 |
| etapa2_beneficiarios (028) | 36 | 36 | 0 |
| etapa2_apoderados (029, 030) | 56 | 56 | 0 |
| etapa4_cuentas_padre (032) | 31 | 31 | 0 |
| etapa4_ocultar_bajas (033) | 20 | 20 | 0 |
| etapa4_lista_alumnos (034) | 27 | 27 | 0 |
| etapa4_lista_apoderados (035) | 27 | 27 | 0 |
| etapa4_carnets (036) | 49 | 49 | 0 |
| etapa4_dashboard (037) | 28 | 28 | 0 |
| etapa4_auditoria (038) | 30 | 30 | 0 |
| etapa4_roles (matriz) | 160 | 160 | 0 |
| **SQL, total** | **514** | **514** | **0** |
| Unitarias del panel (Vitest) | 20 | 20 | 0 |
| E2E del panel (Playwright) | 39 | 39 | 0 |
| Edge Function `guardian-account` (integración) | 17 | 17 | 0 |

Además: `tsc`, `eslint` y `next build` sin errores ni avisos. La Edge Function `guardian-account` tiene su propia prueba de integración (`supabase/functions/guardian-account/test.mjs`, con `supabase functions serve guardian-account` en otra terminal) y pruebas unitarias de la contraseña temporal.

## Matriz de roles (`etapa4_roles.sql`)

Cada una de las 22 funciones del panel se llama como administrador, chofer, asistenta, coordinador, padre y sin sesión. El administrador pasa el control de permisos; todos los demás son rechazados por permisos.

Funciones: `admin_dashboard`, `admin_guardian_detail`, `admin_list_audit`, `admin_list_cards`, `admin_list_guardians`, `admin_list_students`, `create_guardian`, `deactivate_beneficiary`, `enroll_beneficiary`, `issue_qr_card`, `issue_qr_cards`, `link_guardian`, `link_guardian_account`, `log_admin_session`, `log_guardian_account_action`, `log_qr_print`, `report_qr_lost`, `set_guardian_active`, `set_primary_guardian`, `unlink_guardian`, `unlink_guardian_account`, `update_guardian`.

| Operación | Administrador | Chofer / asistenta / padre | Coordinador | Sin sesión |
|---|---|---|---|---|
| Las 22 funciones del panel | Sí | No (rechazado) | No (rechazado) | No (rechazado) |
| Escribir directo en `admin_audit_log`, `qr_codes`, `bus_beneficiaries` | No (solo por funciones) | No | No | No |
| Escribir directo en `bus_guardians` y `bus_student_guardians` | No (solo por funciones) | No | No (desde la migración 040) | No |
| Leer `admin_audit_log`, `qr_codes`, `bus_beneficiaries` | Sí | No | No | No |
| Leer `bus_guardians` y `bus_student_guardians` | Sí | Chofer y asistenta: sí, por diseño (políticas `ops_read_*`). Padre: solo lo suyo (0 sin vínculo) | Sí, por diseño | No |

## Revisión de seguridad

Se revisó con la lista de la skill `security-review`. Resultado por punto:

| Punto | Resultado |
|---|---|
| Secretos | Sin llaves ni contraseñas en el código. La llave de servicio solo existe en la Edge Function, que la toma de su entorno. Los `.env*` están en `.gitignore` (verificado con `git check-ignore`). |
| Autorización | Las 8 páginas del panel y las 3 familias de acciones (`alumnos`, `apoderados`, `qr`) llaman `requireAdmin()`: sesión válida, `is_web_admin()` y MFA completo. El login y la verificación en dos pasos son las únicas acciones sin él, como corresponde. La Edge Function vuelve a exigir sesión, MFA completo e `is_web_admin()`. |
| Entrada de datos | Todos los parámetros de la URL y de las acciones pasan por esquemas de zod (los valores raros caen al valor por defecto). La base valida de nuevo y rechaza lo inválido. |
| Inyección SQL | No hay SQL armado con texto en el panel: todo va por `rpc` o por el cliente de Supabase. En la base, los comodines de búsqueda se escapan y la suite lo prueba. |
| XSS | Sin `dangerouslySetInnerHTML`, `innerHTML` ni `eval`. CSP estricta con nonce, `object-src 'none'` y `frame-ancestors 'none'`. |
| CSRF y cookies | Cookies `httpOnly`, `secure` en producción y `SameSite=Lax`. Las acciones del servidor de Next comprueban el origen. |
| Cabeceras | HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` y `Permissions-Policy` configuradas. |
| Límite de intentos | El login usa Turnstile y los límites de Supabase Auth. No hay límite propio en las acciones: se acepta porque solo entra un administrador con MFA. |
| Datos sensibles | Sin `console.log` de datos. La contraseña temporal solo vive en la memoria del navegador y nunca se guarda en la auditoría (hay prueba). Los errores al usuario son genéricos. |
| Dependencias | Ver `npm audit` abajo. |

### Hallazgos

1. **Medio, resuelto en la migración 040 (falta aplicar en producción): el coordinador escribía directo en apoderados y vínculos.** Las políticas heredadas `coordinator_manage_bus_guardians` y `coordinator_manage_bus_student_guardians` (esquema base 0001, ya en producción) le daban acceso total a esas dos tablas, sin pasar por las funciones del panel y sin dejar rastro en la auditoría. La 040 las quita y retira de `authenticated` los permisos de escritura sobre esas tablas. La app móvil solo las lee (verificado en `mobile/src`), y las funciones del panel siguen escribiendo con el dueño de la tabla. La matriz ya prueba que ningún rol escribe directo. **Antes de aplicarla en producción:** confirmar con quien opere la app móvil que ningún coordinador gestione apoderados desde ella (el rollback está en `040_rollback.sql`).
2. **Bajo, mejorado: la IP del registro de sesión.** Ahora se prefiere `x-vercel-forwarded-for` (la pone la plataforma, el cliente no la puede falsear) y luego `x-real-ip`, y se descarta lo que no sea una IP válida. Sigue siendo un dato informativo.
3. **Informativo: la caché sin conexión del móvil** conserva a un alumno dado de baja hasta que se actualice. Es un límite conocido de R-A7.
4. **Cambio de seguridad por rendimiento:** las páginas ahora comprueban la sesión con `getClaims()` (firma del token, sin llamada de red) en lugar de `getUser()`. Un token vigente de alguien bloqueado sirve para LEER hasta que vence (1 hora). Las acciones que escriben siguen usando `getUser()` y preguntan a Auth. Con un solo administrador con MFA se acepta.

No hay hallazgos críticos ni altos.

### `npm audit` (en `web/`)

- Con todas las dependencias: 7 avisos de severidad moderada, todos por `minimatch` (7.0.0 a 11.0.0, denegación de servicio por `globparts`) a través de `typescript-eslint`. Son las advertencias de minimatch ya conocidas. **No tienen arreglo todavía:** la última versión publicada de `typescript-eslint` (8.72.2) es la que `eslint-config-next` ya usa, y `npm audit fix` no puede cambiarla.
- Solo producción (`npm audit --omit=dev`): **0 avisos**. Los 7 afectan únicamente a las herramientas de desarrollo (lint).
- Se subieron los parches de `next` (16.4.6), `react` y `react-dom` (19.3.1) y `eslint-config-next` (16.4.6). Pasan todas las pruebas.

## Revisión total: rendimiento (2026-11-09)

El usuario reportó lentitud. Medición con `next build` y `next start` y con el servidor de desarrollo, contra Supabase local (con un Supabase en la nube, cada llamada suma además su viaje de red):

| Medida | Antes | Después |
|---|---|---|
| Llamadas a Supabase por página | 4 en fila (`getUser`, `is_web_admin` x2 y los datos) | 2 (`is_web_admin` y los datos) |
| Tiempo del servidor por página (TTFB, producción) | 127 a 241 ms | 76 a 103 ms |
| Servidor de desarrollo (`npm run dev`) | 410 a 660 ms por pantalla | sin cambio: el modo desarrollo compila al vuelo y es el doble de lento que producción. Para juzgar la velocidad hay que usar `npm run build` y `npm start` |
| Lista de apoderados con 4.000 apoderados | 670 a 875 ms | 3 ms |
| Auditoría sin fechas con 100.000 movimientos | 1.364 ms | 46 ms |
| Auditoría, carnets, página 100 | 236 ms | 30 ms |
| Lista de alumnos con 5.000 alumnos | 16 a 33 ms | 6 a 15 ms |
| Lista de carnets | 11 a 13 ms | 7 a 20 ms |
| Escudo y fondo | 222 KB y 99 KB | 16 KB y 50 KB (el desenfoque va ya en la imagen) |
| JS de `/qr` | cargaba `pdf-lib` y `qrcode` (186 KB comprimidos) al abrir | se cargan al pulsar Descargar |

La prueba de volumen se hizo dentro de una transacción con `ROLLBACK` (5.000 alumnos, 3.500 beneficiarios, 4.000 apoderados, 3.000 carnets y 100.000 movimientos de auditoría). No quedan datos de prueba.

Qué se cambió: `requireAdmin` con `getClaims()` y `cache()` y `requireAdminAction` con `getUser()` para escribir; funciones `admin_list_*` que cuentan y cortan la página antes de unir tablas (034 a 038 corregidas); índices en 039 (`039_indexes.sql` y, con aviso a TI SIGEM, `039_indexes_padron.sql`); `issue_qr_cards` para emitir varios carnets en una transacción; una sola invalidación de caché y sin `router.refresh()` repetido; cookie de actividad como mucho una vez por minuto; `qrcode` y `pdf-lib` bajo demanda; zona `<main>` y enlace para saltar al contenido.

## Limitaciones de este informe
- Todo corrió en local. Falta aplicar las migraciones 032 a 040 en producción, en orden y con respaldo (la carga inicial `033_backfill_beneficiaries.sql` va antes de `033_hide_non_beneficiaries.sql` y requiere aviso a TI SIGEM).
- Sin pruebas de carga ni de navegadores distintos de Edge.
- La revisión visual la hizo el desarrollador con capturas; falta la del usuario en un navegador real.
