# Plan de implementación de Incidencias

**Estado** Implementado y validado en local. Las migraciones 046 y 047 quedaron aplicadas en Supabase local. Los indicadores adicionales del Dashboard quedan para una entrega posterior. [Informe de Incidencias](informes/etapa10-incidencias.md) · [Plan de Exportación](14-plan-exportacion.md)

La siguiente entrega agrega el resumen de la operación al Dashboard existente. [Plan de indicadores operativos](16-plan-dashboard-operativo.md)

## 1. Objetivo y alcance

El administrador activo con MFA puede consultar las excepciones de asistencia del transporte escolar desde una sola pantalla, identificar el registro de origen y abrir el viaje o la ficha del alumno para revisar su contexto.

**Alcance propuesto.** Una consulta de solo lectura sobre los datos de transporte que ya registra la aplicación. La primera versión reúne **ausencias registradas y eventos anulados**. La creación manual, la asignación de responsables, el seguimiento por estados, la resolución de casos, las alertas y el CSV de Incidencias quedan fuera de esta entrega.

| Tipo | Cuándo aparece | Datos del registro |
|---|---|---|
| Ausencia registrada | `event_type = 'ausente'` y `voided_at IS NULL` | Alumno, viaje, bus, turno, sentido, hora de registro y operador cuando esté disponible |
| Evento anulado | `voided_at IS NOT NULL` | Los mismos datos de contexto, más tipo de evento original, fecha y hora de anulación, motivo y quién lo anuló cuando esté disponible |

Una ausencia anulada aparece una sola vez como **Evento anulado**. La falta de un escaneo, una bajada pendiente y la marca de sincronización offline, por sí solas, quedan fuera de esta clasificación. Se conserva el historial de alumnos dados de baja y buses inactivos. Los motivos y responsables ausentes se muestran como datos sin registrar. Una anulación conserva el viaje original aunque se haga otro día.

## 2. Regla permanente de diseño y arquitectura

Antes de crear o cambiar cualquier pantalla, revisar las vistas equivalentes y sus componentes. Reutilizar la paleta azul y clara, Manrope, la jerarquía tipográfica, el espaciado, los iconos, botones, etiquetas, estados y patrones de foco existentes. Tomar los estilos de `globals.css` y `admin.css`, incluidas las clases `ad-*`. Usar Auditoría como referencia para filtros y estados, Viajes para la tabla y tarjetas, y Asistencia por alumno para los enlaces de contexto y los motivos de anulación.

Mantener el App Router, las páginas de servidor, el cliente Supabase de sesión, Zod y la organización actual de esquemas, consultas y componentes. Agregar **Incidencias** a la navegación existente. En móvil queda en el menú completo, con los cuatro accesos actuales de la barra inferior. Elegir el icono según el catálogo y la convención de `icons.tsx`. Toda variante de un componente debe apoyarse en los estilos del panel y responder a una necesidad visible que las vistas de referencia ya resuelvan.

## 3. Pantalla y navegación

- Servir `/incidencias` con tabla en escritorio y tarjetas en móvil. Mostrar fecha del viaje, hora de la incidencia, alumno, bus, turno, sentido, tipo y detalle cuando corresponda.
- Mostrar los últimos **siete días, incluido hoy**, según Lima y la fecha del viaje. Ofrecer filtros combinables de fecha, bus, turno y tipo. Conservar los filtros en la URL y ofrecer **Quitar filtros**. Cambiar filtros vuelve a la primera página.
- Mostrar la fecha completa de la incidencia cuando sea distinta de la del viaje. Para una anulación, identificar el registro como anulado y mostrar el evento original. Permitir leer motivos largos sin desbordes.
- Enlazar al detalle existente de Viajes y a la pestaña de Asistencia del alumno. Mantener filtros y página al volver con el navegador. Si falta una referencia histórica que permita abrir un destino, mostrar el dato disponible como texto.
- Usar 20 filas por página. Mostrar el total del conjunto filtrado y ofrecer la última página válida cuando corresponda. Usar los estados del panel para historial vacío, filtros sin resultados, fechas inválidas y error de consulta.

## 4. Datos e implementación

1. **Fijar contrato y línea base.** Revisar `web/AGENTS.md` y la documentación local de Next.js indicada por el repositorio. Confirmar los campos y vínculos en `buscontrol`. Definir primero las pruebas de clasificación, permisos y navegación. Medir las páginas de referencia antes de cambiar la navegación.
2. **Construir la consulta.** Agregar una RPC de solo lectura en `supabase/pending/` con su rollback. Partir de `bus_attendance_records` y `bus_trips`, y resolver bus, nombre del alumno y actor por los vínculos existentes. Para una anulación, la hora y el actor salen de `voided_at` y `voided_by`. Para la ausencia, usar `scanned_at` y la preferencia de Viajes entre `scanned_by` y `operator_id`. La consulta devuelve los campos permitidos, las filas y el total.
3. **Mantener la autorización.** Usar `requireAdmin()` en la página. Comprobar en la RPC el rol de administrador activo y `aal2`, limitar los permisos de ejecución y mantener el patrón de `search_path` de las RPC actuales. Exponer los identificadores necesarios para abrir el viaje y la ficha. Limitar la proyección al nombre del alumno y los campos operativos. DNI, contactos, QR y coordenadas quedan fuera.
4. **Aplicar reglas de filtros y orden.** Validar los parámetros con Zod y comprobarlos también en Supabase. Usar límites inclusivos por `trip_date` en el calendario de Lima. Ordenar por fecha del viaje descendente, hora de la incidencia descendente con nulos al final e ID del evento como desempate. Resolver etiquetas y catálogos con los patrones de Viajes. Mantener la consulta sin escrituras, tablas de incidencias duplicadas ni cambios de captura en el móvil.
5. **Integrar la vista y verificar.** Agregar el acceso al menú y reutilizar los controles, paginación y patrones de tabla y tarjetas. Ejecutar las pruebas funcionales, visuales y de carga. Comparar `EXPLAIN (ANALYZE, BUFFERS)` con los índices actuales. Si la evidencia muestra un recorrido evitable, medir un índice con la misma carga y conservarlo si mejora el caso.

## 5. Pruebas y criterios de aceptación

| Prueba | Evidencia requerida |
|---|---|
| SQL en Supabase local | Ausencia vigente, ausencia anulada con una sola fila, evento regular fuera del listado, anulación posterior al día del viaje, responsable o motivo faltante, alumno de baja y bus inactivo. Fechas inclusivas, filtros combinados, orden estable, total y páginas fuera de rango. Verificar acceso de administrador activo con `aal2` y rechazo de anónimo, administrador inactivo, administrador sin MFA y roles móviles. Aplicar, revertir y reaplicar la migración. |
| Vitest | Validación de fechas y filtros, siete días iniciales al cruzar la medianoche de Lima, etiquetas, resolución de horas nulas y conservación de filtros en los enlaces de paginación. |
| Playwright en Edge | Entrar con MFA, abrir el módulo desde el menú de escritorio y móvil, combinar filtros, paginar, abrir el viaje y la Asistencia del alumno, y volver con los filtros conservados. Cubrir historial vacío, consulta sin resultados, fechas inválidas, error de consulta y acceso directo fuera de sesión. Ejecutar la regresión completa del panel. |
| Revisión visual | Comparar con Auditoría, Viajes y Asistencia. Revisar escritorio, 360 y 320 px, reflujo al 200 %, navegación por teclado y foco visible por encima de la barra móvil. Probar nombres y motivos largos. Guardar capturas de escritorio y móvil. |
| Regresión de datos | Confirmar que los mismos registros siguen en Viajes y Asistencia, que se conservan los conteos vigentes y que los CSV mantienen sus reglas de filtrado y autorización. |

## 6. Velocidad y carga

- Medir antes y después el listado y detalle de Viajes, Asistencia por alumno y Auditoría. Usar compilaciones de producción y el mismo Supabase local con **10.000 viajes y 100.000 eventos sintéticos** en ambas tandas. Distribuir ausencias y anulaciones entre distintos días, buses y turnos. Incluir un día con muchas incidencias y registrar cuántos eventos corresponden a cada tipo.
- Medir Incidencias con el rango inicial, ambos tipos por separado, filtros combinados, una página profunda y un resultado vacío. Para cada caso calentar las rutas y tomar **30 solicitudes con una sesión MFA y 30 con cinco sesiones MFA independientes**. Verificar el total y las filas devueltas además del estado HTTP.
- Registrar TTFB de página y latencia de RPC con p50, p95 y errores por caso. Guardar los planes de ejecución y registrar filas descartadas y búferes. Si se cambia un índice o la consulta, repetir las mediciones comparables. Repetir controles si se observa una degradación sostenida.
- Aplicar las metas locales del panel de **300 ms p95 con una sesión, 600 ms con cinco y 100 ms p95 por RPC**, con cero errores inesperados. Comparar también los controles de Exportación previa para confirmar la continuidad del panel. [Rendimiento de Exportación](informes/etapa9-exportacion.md)

## 7. Hallazgos, entrega y reversión

Crear `docs/web/informes/etapa10-incidencias.md` con entorno, datos, comandos, resultados por suite, mediciones antes y después y capturas. Para cada bug registrar severidad, entorno, pasos de reproducción, resultado esperado, observado, evidencia, corrección y estado. Corregir los problemas de permisos, clasificación, conteos, navegación y lectura en móvil, y agregar una regresión para cada caso corregido que carezca de cobertura.

Cerrar con lint, Vitest, suites SQL, Playwright, build y presupuestos de rendimiento aprobados. En validación, aplicar primero la migración, publicar la web y comprobar una ausencia y una anulación con una cuenta de prueba con MFA. Para revertir, retirar primero la versión web y ejecutar después el rollback de la RPC y de cualquier índice nuevo.

## 8. Skills recomendadas

| Tarea | Skill |
|---|---|
| Preparación de este plan, criterios de aceptación y secuencia de verificación | `agentic-engineering` |
| Continuidad visual y revisión de las referencias | `impeccable`, con la guía `shape` |
| Páginas, navegación y foco | `vercel-react-best-practices` y `accessibility` |
| RPC, permisos, privacidad e índices | `supabase-postgres-best-practices` y `security-and-hardening` |
| Línea base y pruebas de carga | `benchmark` y `performance` |
| Revisión en navegador, hallazgos y regresiones | `browser-qa` y `code-review-and-quality` |
