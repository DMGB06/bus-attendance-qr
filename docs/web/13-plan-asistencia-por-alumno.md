# Plan de implementación de Asistencia por alumno

**Estado:** implementado y validado en local. Las migraciones 043 y 044 quedaron aplicadas en Supabase local. Esta entrega sigue al módulo Viajes y agrega una pestaña de consulta en la ficha de Alumnos. La exportación, las incidencias y los indicadores del Dashboard corresponden a entregas posteriores. [Informe de validación, rendimiento y hallazgos](informes/etapa8-asistencia.md)

## 1. Objetivo y criterio de aceptación

El administrador puede abrir la ficha de un alumno, consultar sus subidas, bajadas y ausencias de la semana, filtrar el historial y abrir el detalle de cualquiera de esos viajes. El historial también está disponible si el beneficiario fue dado de baja.

## 2. Pantalla y continuidad visual

**Regla permanente:** revisar las pantallas equivalentes del panel antes de crear una nueva. Reutilizar sus colores, tipografía, espaciado, iconos, botones y estados. Las referencias son Alumnos para la cabecera y la navegación, Auditoría para los filtros y Viajes para los registros. Usar Manrope, la paleta azul y clara y los patrones `ad-*` de `globals.css` y `admin.css`. Cada nueva pantalla sigue la arquitectura y el diseño del panel web.

- Agregar **Datos del alumno** y **Asistencia** dentro de la ficha. La vista inicial es Datos del alumno. La URL directa de Asistencia es `/alumnos/[id]?vista=asistencia`.
- Mostrar fecha del viaje, hora registrada, bus, turno, sentido y evento. Identificar subidas manuales y eventos anulados, con el motivo registrado cuando exista. Enlazar cada fila al detalle en `/viajes/[id]`.
- Mostrar por defecto los **últimos siete días, incluido hoy**, en hora de Lima. Filtrar por fechas, turno y tipo de evento. **Subidas** incluye QR y manual. **Subidas manuales** consulta solo estas últimas.
- Presentar un resumen de viajes con subida registrada y viajes con ausencia registrada. Fecha y turno afectan el resumen y el listado. El tipo de evento afecta solo al listado.
- Usar la tabla existente en escritorio y tarjetas en móvil. Conservar el contexto de la ficha al aplicar o quitar filtros, paginar y volver con el navegador. Cubrir historial vacío, filtros sin resultados, fechas inválidas y errores de consulta.

## 3. Implementación y reglas de datos

1. **Next.js.** Resolver la vista desde el servidor. Validar parámetros con Zod y usar el cliente Supabase existente. Consultar el historial al abrir Asistencia. Mantener el flujo actual de Datos del alumno. Leer `web/AGENTS.md` y la documentación local de Next.js que indica.
2. **Supabase.** Agregar una RPC de solo lectura y su rollback en `supabase/pending/`. Seguir el patrón de Viajes. La RPC recibe UUID del alumno, fechas, turno, tipo de evento y paginación. Devuelve filas, total de resultados y los dos contadores. Leer `bus_attendance_records`, `bus_trips` y `bus_units` mediante los vínculos existentes. Devolver los campos que muestra la pantalla.
3. **Permisos.** Usar `requireAdmin()` en la página y verificar en la RPC que el usuario sea administrador activo con MFA `aal2`. Consultar por `student_id` con independencia del estado actual del beneficiario.
4. **Fechas.** Filtrar por `trip_date` con límites inclusivos del calendario de Lima. Mostrar `scanned_at` como hora registrada e incluir su fecha si difiere de la del viaje. Un evento sincronizado después de medianoche conserva su asociación con el viaje.
5. **Conteos.** Contar viajes por alumno. Una subida QR y una manual en un mismo viaje suman una sola subida. Las ausencias cuentan cuando existe un evento `ausente` vigente. Los anulados aparecen en el historial y quedan fuera de ambos totales.
6. **Paginación.** Servir 20 filas por página. Ordenar por fecha del viaje descendente, hora registrada descendente con nulos al final e ID como desempate. Devolver el total incluso si la página queda fuera de rango y ofrecer acceso a la última página válida.

## 4. Pruebas, velocidad y hallazgos

| Prueba | Criterio |
|---|---|
| SQL en Supabase local | Validar fechas inclusivas, filtros combinados, paginación y conteos. Cubrir QR y manual en un mismo viaje, ausencias y anulaciones, y beneficiario dado de baja. Probar acceso de administrador `aal2` y rechazo de administrador sin MFA, roles móviles y anónimo. Aplicar, revertir y reaplicar la migración. |
| Vitest | Cubrir parámetros, rango inicial de siete días, medianoche de Lima y conservación de filtros en enlaces. |
| Playwright | Entrar con MFA, abrir la ficha, consultar Asistencia, filtrar, paginar, abrir un viaje y volver con filtros conservados. Cubrir ficha sin eventos, alumno dado de baja y búsqueda vacía. Ejecutar la regresión completa del panel. |
| Revisión visual | Comparar con las pantallas de referencia. Revisar escritorio, móvil hasta 320 px, reflujo al 200 %, teclado, foco visible, nombres largos y motivos de anulación extensos. |
| Velocidad y carga | Medir antes y después la ficha normal de Alumnos y el detalle de Viajes. Medir también la pestaña de Asistencia en compilación de producción con Supabase local y 10.000 viajes y 100.000 eventos sintéticos. Incluir un alumno con al menos 500 eventos. Tomar 30 solicitudes por caso tras calentar el entorno, con una y cinco sesiones. Registrar p50, p95 y errores. |

Las metas locales de p95 son **300 ms con una sesión, 600 ms con cinco sesiones y 100 ms por RPC**. Usar `EXPLAIN (ANALYZE, BUFFERS)`. Si la consulta recorre muchas filas de otros alumnos, medir un índice con `student_id` primero y conservarlo si la comparación evidencia una mejora. [Informe de rendimiento de Viajes](informes/etapa7-viajes.md)

Registrar los bugs en `docs/web/informes/` con severidad, pasos para reproducir, resultado esperado y observado, evidencia y estado. Corregir los fallos que afecten permisos, conteos, navegación o lectura en móvil. Agregar regresiones para los casos corregidos que aún carezcan de cobertura.

## 5. Skills y cierre

| Tarea | Skill |
|---|---|
| Planificación y criterios de aceptación | `agentic-engineering` |
| Continuidad visual y revisión de la pestaña | `impeccable`, con la guía `shape` para el plan y la revisión del resultado en navegador |
| Páginas y consultas de Next.js | `vercel-react-best-practices` |
| RPC, permisos, paginación e índices | `supabase-postgres-best-practices` y `security-and-hardening` |
| Línea base, carga y medición posterior | `benchmark` y `performance` |
| Revisión de cambios, hallazgos y regresiones | `code-review-and-quality` |

La entrega se cierra con lint, Vitest, SQL, Playwright y build aprobados, y con el informe visual y de rendimiento revisado. En el entorno de validación, aplicar primero la migración y luego publicar la web. Para revertir, retirar primero la versión web y ejecutar después el rollback de la migración.

Los siete días iniciales y las 20 filas por página son los valores propuestos para mantener el comportamiento de Viajes.

La siguiente entrega propuesta usa estas consultas para descargar los resultados filtrados. [Plan de Exportación](14-plan-exportacion.md)
