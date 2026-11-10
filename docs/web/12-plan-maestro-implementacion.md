# Plan maestro de implementación — Sistema web BusControl

Estado: BORRADOR PARA APROBACIÓN. No se ha programado nada. Basado solo en lo ya definido en `docs/web/01` a `11`. Lo que no está definido se marca como **DECISIÓN** y se pregunta antes de construir (regla del proyecto: decisiones de arquitectura se consultan; decisiones de diseño se muestran en artifact visual).

## 1. Qué es y qué no es
Sistema web administrativo, complementario a la app móvil, mismo Supabase. Un solo administrador. El móvil no se toca. El padrón `social_bus_escolar` es solo lectura.

## 2. Requerimientos (solo los ya definidos)
| Módulo | Requerimiento | Fuente |
|---|---|---|
| Acceso | Login de administrador, rutas protegidas por rol | 01, 03 |
| Carnets QR | Emitir con el `codigo` del padrón, estados vigente/reemplazado/perdido, reimprimir, reportar pérdida, PNG y PDF local | 01, 02, 11 |
| Alumnos | Buscar en padrón; alta/baja lógica como beneficiario; ver apoderados y carnets | 01, 08 |
| Apoderados | Alta, edición, búsqueda, activar/desactivar, vincular/desvincular, principal | 08 |
| Cuentas de padres | Crear la cuenta de un apoderado, reiniciar su contraseña, bloquear y reactivar el acceso, sin envío de correo | 03, 08 |
| Dashboard | Métricas operativas básicas, alertas (alumnos sin apoderado / sin carnet vigente) | 01, 09 |
| Auditoría | Log de acciones del administrador | 01, 02 |
| Buses y tripulación | Alta de unidades, asignación chofer/asistenta por fecha | 01, 09 |
| Consultas operativas | Viajes y asistencia, solo lectura | 01, 09 |

Fuera de alcance (futuro, ya documentado en 01): escaneo web, portal de apoderados web, mapa GPS web, offline web, más de un administrador, métricas avanzadas/Excel, reemplazo del script Python, revocación real de carnets en el móvil (opción 2 del doc 11).

## 3. MVP vs. futuro (PROPUESTA — requiere tu aprobación)
Nota: antes pediste "todo de una vez, sin MVP". Aquí "MVP" = primer corte usable en producción, no un producto recortado: el resto sigue siendo parte del plan.

- **Release 1 (MVP):** Acceso, Carnets QR, Alumnos beneficiarios, Apoderados, Cuentas de padres (sin envío de correo), Dashboard mínimo, Auditoría. Razón: el QR es el requerimiento más urgente (doc 09) y alumnos/apoderados son el contexto que necesita.
- **Release 2:** Buses y tripulación, Consultas operativas. Razón: ya están en el alcance incluido, pero son de menor urgencia, y la tripulación hoy solo la edita `service_role` (migración 014), por lo que exige migración y diseño propios.
- **Futuro / excluido:** lista de la sección 2.

**DECISIÓN 1:** ¿Apruebas este corte? ¿O todo en un solo release?

## 4. Roles
Único rol web: `administrador` (enum `app_role`, migración 025). Roles móviles (chofer, asistenta, padre, coordinador) no acceden al web; fallan cerrado. Primer administrador se asigna manualmente con privilegios de servicio (trigger de protección). Riesgo: un solo administrador sin respaldo de recuperación (doc 07, riesgo 1).

## 5. Arquitectura
- Next.js App Router + TypeScript + Tailwind, carpeta `web/` en el repo. Supabase Auth con `@supabase/ssr`. Despliegue en Vercel.
- Lecturas simples: consulta directa o Server Action. Escrituras: Server Actions que llaman funciones `SECURITY DEFINER` con el cliente de sesión (nunca `service_role`, porque `auth.uid()` sería nulo).
- Justificación: reutiliza la base y auth existentes, evita un backend aparte, y mantiene el chequeo de rol en la base de datos (no solo en la UI).
- **DECISIÓN 2:** versión de Next.js. En Next 15 el middleware es `middleware.ts`; en 16+ es `proxy.ts`; con el nombre equivocado no corre. Fijar versión al instalar.
- **DECISIÓN 3:** librería de PDF/QR para carnets (no definida).

## 6. Base de datos
Redactadas y ensayadas en Docker (no aplicadas en producción):
- `migrations/025_add_administrador_role.sql` — enum `administrador` (ya en `migrations/`)
- `pending/026_create_qr_codes_and_admin_audit.sql` — `qr_codes`, `admin_audit_log`, `issue_qr_card`, `report_qr_lost`
- `pending/027_admin_read_padron.sql` — lectura del padrón para administrador (requiere aviso previo a TI SIGEM; única que toca `public`)
- `pending/028_create_bus_beneficiaries.sql` — `bus_beneficiaries`, `enroll_beneficiary`, `deactivate_beneficiary`; rollback `028_rollback.sql`
- `pending/029_guardians_admin_rpc.sql` — lectura y escritura de apoderados y vínculos para el administrador (`create_guardian`, `update_guardian`, `set_guardian_active`, `link_guardian`, `set_primary_guardian`, `unlink_guardian`); rollback `029_rollback.sql`
- `pending/030_revoke_guardians_grants.sql` — quita grants sobrantes de `anon` y `authenticated` en apoderados; rollback `030_rollback.sql`
- `pending/031_admin_session_audit.sql` — `log_admin_session(action, ip, user_agent)`: registra `session_login` y `session_logout` del administrador en `admin_audit_log`; rollback `031_rollback.sql`. NO aplicada en producción
- `tests/check_duplicados_apoderados.sql` — revisión de solo lectura de duplicados (correr en producción antes de cualquier UNIQUE)
- `tests/etapa1_roles.sql` y `tests/etapa1_extra.sql` — pruebas por rol (etapa 1)
- `tests/etapa2_beneficiarios.sql` — pruebas de alta/baja/reactivación de beneficiario (028)
- `tests/etapa2_apoderados.sql` — pruebas de apoderados, vínculos y principal (029)

Flujo de ensayo (Etapa 2): `supabase start` → aplicar 026 a 029 con `docker exec` → ejecutar los cuatro scripts de `tests/` con usuarios de cada rol.

Pendientes de redactar (una migración por módulo, con rollback):
- Políticas de lectura del administrador para buses, viajes, asistencia (Release 2).
- Escritura de buses y tripulación (Release 2).
Reglas fijas: DDL separado de DML; índice único parcial "uno vigente por alumno"; `REVOKE` explícito a anon/public en tablas y funciones nuevas; `SET search_path` en funciones; el actor siempre sale de `auth.uid()`.

## 7. QR
El valor impreso es el `codigo` del padrón (ej. BU0098), formato que no cambia. `qr_codes` es historial, no fuente de verdad. Renovar = reimprimir. Limitación conocida y aceptada: un carnet "perdido" sigue validando en el móvil (informativo). PNG individual y PDF multi-carnet se generan en el navegador/servidor y se descargan; no se guardan en Storage. **DECISIÓN 5 (cerrada, ver sección 14):** el carnet web replica el diseño 2026 del script Python (mica 95 × 60 mm, 8 por hoja A4), para que el carnet de la web y el del script sean idénticos.

## 8. UX/UI
Login APROBADO (artifact v10): tarjeta blanca de 408 px y radio 10 px sobre la foto de la municipalidad (difuminado 3 px, velo celeste), banda celeste con el escudo sin círculo, campos con ícono y botón con radio 8 px, paleta "Cielo" (botón `#2478C9`, campo `#E8F3FC`, borde `#5A8DB8`, error `#A3231B` sobre `#FDEDEA`), tipografía Manrope, solo apariencia clara, sin scroll en 768 px de alto. Tokens en `web/app/globals.css`. Resto de pantallas sin diseñar. Por la regla del proyecto, cada pantalla clave se presenta como artifact visual (HTML) para aprobar antes de codificar: login, dashboard, lista/búsqueda de alumnos, ficha de alumno (apoderados, carnets, baja), emisión/reimpresión de carnet, vista de impresión PDF, gestión de apoderados. Identidad: escudo real de Cerro Azul (`mobile/assets/images/escudo_MDCA.png`), institucional, sobrio (PRODUCT.md). Accesibilidad: contraste AA mínimo.

## 9. Seguridad
Ya cubierto en doc 11: sin INSERT/UPDATE/DELETE directo; lectura de `qr_codes`/auditoría solo administrador; anon revocado; el rol nuevo no hereda permisos operativos (listas explícitas verificadas). Añadir al plan: rutas protegidas en servidor y no solo en cliente; variables de entorno solo URL + anon key (`service_role` jamás en el web); revisión de cada migración en un proyecto de pruebas con un usuario por rol antes de producción; respaldo de BD antes de aplicar.

## 10. Pruebas
Según doc 06: unitarias (Jest), E2E (Playwright), pruebas de migraciones con un usuario por rol, concurrencia de emisión, tipos generados. Añadido: pruebas de alta/baja de beneficiario y de apoderados. Entorno de pruebas: Supabase local en Docker (`supabase start`); las pruebas por rol se ejecutan con `docker exec ... psql < supabase/tests/etapa1_roles.sql` y `etapa1_extra.sql`.

## 11. Etapas, entregables, dependencias, riesgos
| Etapa | Entregable | Depende de | Riesgo principal |
|---|---|---|---|
| 0. Aprobación | Decisiones 1-5 cerradas; diseño de pantallas aprobado (artifacts) | tú | Avanzar sin decisiones |
| 1. Entorno de pruebas | HECHA: Supabase local en Docker, esquema idéntico a producción; 025-027 ensayadas con usuarios por rol | acceso a Supabase | Ensayo sin datos reales |
| 2. Base de datos R1 | HECHA en Docker: 028 (beneficiarios) y 029 (apoderados y vínculos) ensayadas con usuarios por rol. PENDIENTE: informe de pruebas por rol y revisión de duplicados de DNI y teléfono | Etapa 1, aviso a TI SIGEM para 027 | Cambio en schema compartido |
| 3. Base técnica web | HECHA en local: `@supabase/ssr`, login por Server Action, `proxy.ts` con CSP nonce, `requireAdmin()`, MFA TOTP, cerrar sesión, headers, auditoría de sesión (031). Probado con Docker: admin entra con MFA, rol móvil rechazado, sin sesión redirige, cookie HttpOnly, Origin ajeno rechazado. Turnstile listo en código pero sin llaves | Decisión 2 | `cacheComponents` apagado (incompatible con CSP nonce) |
| 4. Módulos R1 | QR, alumnos, apoderados, dashboard mínimo, auditoría | Etapas 2-3, diseños aprobados | Alcance creciente |
| 5. Calidad R1 | Pruebas unitarias, E2E, revisión de seguridad | Etapa 4 | Cobertura insuficiente de RLS |
| 6. Producción R1 | Respaldo, migraciones en prod, creación manual del admin, deploy Vercel, dominio | Dominio definido (pendiente, doc 05) | Dominio sin definir; rollback borra historial QR |
| 7. Release 2 | Buses, tripulación, consultas operativas | R1 estable | Políticas de lectura y escritura por módulo |
| 8. Futuro | Según lista excluida, cada uno con su propio plan | decisión del usuario | — |

Riesgos transversales (doc 07): administrador único, carnet perdido sigue validando, aviso a TI, dominio sin definir, migraciones sin probar, `AppRole` del móvil sin `administrador`.

## 12. Skills recomendadas por etapa
Evaluación propia del informe del agente investigador (ver sección 13). Ninguna se ha instalado ni modificado. Las locales ya están disponibles; las externas requieren tu autorización.

| Etapa | Skill | Origen | Por qué | Verificada |
|---|---|---|---|---|
| 0-2, 4 | `supabase-extension-planning` | local | Escrita para este mismo caso (admin Next.js sobre Supabase con app móvil): auditoría RLS, funciones SECURITY DEFINER, reglas de Next 15, middleware por versión | Leída completa |
| 2 | `database-migrations` | local | Checklist de migraciones, separar DDL/DML, rollback, índices concurrentes | Leída completa |
| 0-2 | `change-impact` | local | Análisis de impacto antes de cambiar | Solo descripción |
| 2, 5 | `supabase-postgres-best-practices` | externa, github.com/supabase/agent-skills (MIT, ~3k estrellas, oficial) | Cubre RLS y diseño de esquema con ejemplos correcto/incorrecto | Repo y descripción verificados; contenido de reglas no leído |
| 3-4 | `supabase` (misma fuente) | externa | Auth, `@supabase/ssr`, sesiones, RLS | Repo y descripción verificados |
| 0, 4 | `claude-design`, `popular-web-designs`, `accessibility` | local | Generar los artifacts de diseño a aprobar; patrones y AA | Solo descripción |
| 4-5 | `test-driven-development`, `e2e-testing` | local | Pruebas por módulo; Playwright | Solo descripción |
| 4-5 | `requesting-code-review`, `security-review` | local | Revisión previa a cada commit (secretos, SQL, auth) | Solo descripción |
| 0 | `architecture-diagram` | local | Diagrama de arquitectura para aprobar | Solo descripción |

Antes de usar cualquiera "solo descripción" conviene leerla completa en el momento.

## 13. Evaluación del informe de NVIDIA
- **Modelo:** el informe reporta `nemotron-3.5-lightning-30b-a3b`, no el Super VL 120B que pediste. Fue el que respondió la delegación.
- **Cobertura incompleta:** afirma "38 skills instaladas"; hay cientos. Omitió las más pertinentes (`supabase-extension-planning`, `database-migrations`, `change-impact`, `security-review`, `e2e-testing`). Por eso rehíce la selección local.
- **Aceptado:** `supabase/agent-skills` (verifiqué que el repo existe, MIT, oficial), `test-driven-development`, `requesting-code-review`, `architecture-diagram`, `popular-web-designs`.
- **Descartado:** `weekly-review-planning` (es para revisión semanal, no planifica proyectos); `spike` y `simplify-code` (no aportan a este plan); `codebase-inspection` (el repo web aún no existe).
- **Descartado por riesgo:** `vercel-deploy` (sube el código del proyecto a una URL de vista previa sin autenticación; inadecuado para un sistema municipal con datos de menores) y `fullstack-deploy` (automatiza esquema, repo y deploy con tokens en una sola conversación: choca con la regla de aprobar decisiones y con el ensayo previo de migraciones).
- **Prematuro:** `next-bundle-optimizer` exige Next 16.4+/Turbopack; no hay versión fijada ni app que optimizar.
- No leí el contenido de las skills externas más allá del README del repo; la confianza es media hasta revisarlas.

## 14. Decisiones
| # | Tema | Estado | Resolución |
|---|---|---|---|
| 1 | Corte R1 / R2 | CERRADA | Aprobado el corte de la sección 3 |
| 2 | Versión de Next.js | CERRADA | Next 16.4.5 (ya instalado en `web/`). El middleware se llama `proxy.ts`, no `middleware.ts`. Leer `node_modules/next/dist/docs/` antes de escribir código (lo exige `web/AGENTS.md`) |
| 3 | Librería PDF/QR | RECOMENDADA, a confirmar al instalar | `qrcode` (PNG del QR) + `pdf-lib` (hoja A4 con varios carnets): ligeras, corren sin servidor de fuentes. Verificar compatibilidad con React 19 / Next 16 al instalar |
| 4 | Baja de beneficiario | CERRADA | Baja lógica (soft delete): tabla `bus_beneficiaries` con llave primaria `student_id` (referencia al `id` del padrón `social_bus_escolar`, no al `codigo`; el `codigo` puede ser NULL o cambiar). Columnas: `is_active`, `enrolled_at`, `enrolled_by`, `deactivated_at`, `deactivated_by`, `deactivated_reason` (obligatorio al dar de baja, máximo 200). Funciones `enroll_beneficiary(student_id)` (alta o reactivación) y `deactivate_beneficiary(student_id, reason)` (SECURITY DEFINER, solo administrador, derivan el usuario de `auth.uid()`). Auditoría: `beneficiary_enroll`, `beneficiary_reactivate`, `beneficiary_deactivate`. La baja no cierra el carnet vigente en `qr_codes`. El `codigo` (ej. BU0098) solo se imprime en el carnet, nunca se usa como clave foránea. Reversible. Visible solo en el web: no cambia el comportamiento del móvil ni cierra el carnet. Consecuencia aceptada: un alumno dado de baja aún puede validar en el móvil mientras siga activo en el padrón **Actualizado 9/11/26:** desde la migración 033 la baja oculta al alumno en el móvil (R-A7); ver `contexto/decisiones.md`. |
| 5 | Carnets por hoja y diseño | CERRADA | Se reutiliza el diseño 2026 del script `scripts/generar_carnets_qr.py` (captura aportada por el usuario): cabecera azul `#152766` con escudo, "MUNICIPALIDAD DE CERRO AZUL" y "TRANSPORTE ESCOLAR" (celeste `#5DB8E5`), franja dorada `#FFCC00`, QR grande a la izquierda, nombre del alumno en mayúsculas y chip "CÓDIGO BUxxxx" a la derecha, pie "Válido para control de asistencia · año". Sin colegio ni dirección. Tamaño de mica 95 × 60 mm horizontal (el script también admite vertical). Por hoja A4 con margen mínimo de 5 mm caben 8 (2 × 4). El año del pie es el año de impresión, no una fecha de vencimiento |
| 6 | Skills externas de Supabase | CERRADA | Autorizadas e instaladas: `supabase` y `supabase-postgres-best-practices`, a nivel de usuario (`~/.claude/skills`), sin tocar el repo |
| 7 | Dominio | CERRADA | Solo Vercel, dominio por defecto `*.vercel.app`; dominio municipal propio queda como mejora futura |

| 8 | MFA del administrador | CERRADA | TOTP obligatorio. Recuperación manual con privilegios de servicio si pierde el factor |
| 9 | CAPTCHA en login | CERRADA | Cloudflare Turnstile tras fallos, junto al rate limit de Supabase Auth |
| 10 | Bloqueo propio por cuenta o IP | CERRADA | No al inicio; se agrega si aparecen ataques. Resto de medidas de login en `03-autenticacion-y-roles.md` |

Ajuste por la decisión 2: en las secciones 5 y 11, donde dice middleware, el archivo es `proxy.ts` (Next 16).
