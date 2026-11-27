# Plan de implementación de indicadores operativos del Dashboard

**Estado** Implementado y validado en Supabase local. Esta entrega amplía el Dashboard existente después de Viajes, Asistencia, Exportación e Incidencias. [Informe de ejecución](informes/etapa11-dashboard-operativo.md)

## 1. Objetivo y alcance

El administrador activo con MFA puede abrir el Dashboard y ver la operación del día en Lima, cuántos viajes tuvieron lugar durante la última semana y dónde consultar los registros detrás de cada indicador.

**Alcance propuesto.** Agregar una sección **Operación del transporte** con cuatro indicadores de hoy y una gráfica de viajes de los últimos siete días, incluido hoy. Conservar la sección actual de alumnos, apoderados, carnets y pendientes, sus cifras y sus enlaces. El rango fijo y las definiciones de la tabla delimitan esta entrega. Los filtros avanzados, la actualización automática, las nuevas exportaciones y los porcentajes de asistencia quedan para entregas futuras.

| Indicador | Fuente y regla de conteo | Destino |
|---|---|---|
| Viajes en curso | Filas de `bus_trips` de hoy con `status = 'active'` | Viajes con las dos fechas de hoy y estado En curso |
| Viajes cerrados | Filas de `bus_trips` de hoy con `status = 'completed'` | Viajes con las dos fechas de hoy y estado Cerrado |
| Subidas registradas | Pares distintos de viaje y alumno con al menos un evento vigente `subio` o `manual` | Consultar los eventos desde el detalle de Viajes |
| Incidencias | Eventos anulados más ausencias vigentes según las reglas de Incidencias | Incidencias del día, con desglose de ausencias y anulaciones |
| Viajes por día | Una barra por día, suma de viajes en curso y cerrados, con ceros para fechas sin viajes | Enlace al listado de Viajes del mismo rango y tabla accesible con los valores diarios |

Usar `trip_date` para todos los cortes del calendario. Una subida QR y otra manual del mismo alumno en el mismo viaje cuentan como una. Otra subida vigente del alumno en un viaje distinto suma otra. Una ausencia anulada cuenta solo como anulación. La hora de registro o anulación puede cambiar de día sin mover el evento fuera del viaje original. El estado actual del alumno o del bus no altera los conteos históricos de la operación. Aclarar en el bloque de gestión que su nota sobre alumnos de baja corresponde a sus propios indicadores.

## 2. Regla permanente de diseño y arquitectura

Antes de crear o modificar cualquier pantalla, revisar las vistas equivalentes y sus componentes. Reutilizar la paleta azul y clara, Manrope, la jerarquía tipográfica, el espaciado, los iconos, los enlaces, los botones y los estados de `globals.css` y `admin.css`. El Dashboard vigente es la referencia para tarjetas `ad-stat`, cuadrículas `ad-stats`, gráficas `ad-graf` y su alternativa **Ver como tabla**. Viajes e Incidencias son las referencias para fechas, enlaces filtrados y avisos.

Mantener el App Router, la página de servidor, la organización actual de consultas y esquemas, el cliente de sesión y las RPC de Supabase. Usar la ruta `/` y la navegación existente. Componer el bloque nuevo reutilizando los componentes visuales actuales y su convención de SVG. Evitar una dependencia de gráficas para esta ampliación.

## 3. Pantalla y comportamiento

- Mantener el resumen actual al inicio y agregar la sección operativa a continuación, con la fecha de corte visible. Aplicar el reflujo de tarjetas y gráficas que ya usa el Dashboard.
- Los enlaces de Viajes e Incidencias llevan las fechas concretas que produjo el resumen. El acceso de Subidas dirige a los viajes del día y su texto avisa que los eventos se consultan en el detalle.
- Mostrar cero para un conteo válido y explicar los días sin registros. Ante un error del resumen operativo, mostrar un aviso en su sección con opción de reintentar y conservar disponible el resumen de gestión.
- La gráfica tiene título y descripción accesibles. Su tabla presenta los siete días en el mismo orden, con estado de viajes y total por día. Los enlaces y **Ver como tabla** funcionan con teclado. Revisar pantallas estrechas y que el foco quede visible sobre la barra móvil.

## 4. Implementación

1. **Fijar el contrato y la línea base.** Leer `web/AGENTS.md` y la documentación local de Next.js indicada por el repositorio. Revisar `admin_dashboard()`, `dashboard-queries.ts`, `graficos.tsx` y las definiciones de Viajes, Asistencia e Incidencias. Preparar los casos de comparación antes de editar.
2. **Agregar la consulta operativa.** Crear una RPC de solo lectura y su rollback en `supabase/pending/`. Resolver una vez la fecha de Lima dentro de la consulta y devolver la fecha de corte, los cuatro indicadores, el desglose de incidencias y los siete puntos diarios en un único resultado. Trabajar con los viajes del rango, agrupar los eventos del día y seleccionar solo agregados. Mantener el contrato vigente de `admin_dashboard()`.
3. **Aplicar permisos y validar los datos.** Usar `requireAdmin()` en la página. Verificar administrador activo con `aal2` también en la RPC, limitar su ejecución como en Incidencias y establecer el mismo patrón de `search_path`. Validar con Zod los conteos, las fechas y la serie de siete días. La respuesta solo incluye agregados y fechas.
4. **Integrar la vista.** Cargar las dos consultas independientes en paralelo mediante el cliente existente. Usar la fecha de corte devuelta por Supabase al construir etiquetas y enlaces para mantener el mismo día al cruzar medianoche. Reutilizar `urlViajes` y `urlIncidencias` para los destinos. Mantener los fallos del resumen operativo dentro de su sección.
5. **Medir y cerrar.** Ejecutar las pruebas funcionales, visuales y de carga. Consultar `EXPLAIN (ANALYZE, BUFFERS)` con los índices existentes. Probar un índice adicional solo si hay un recorrido evitable e incluirlo únicamente si demuestra una mejora con la misma carga.

## 5. Pruebas y criterios de aceptación

| Prueba | Evidencia requerida |
|---|---|
| SQL local | Conteos con viajes activos y cerrados, QR y manual en el mismo viaje, un alumno en viajes distintos, subidas anuladas, ausencia anulada, alumno de baja y bus inactivo. Verificar rangos inclusivos, serie de siete fechas con huecos a cero y resultados consistentes al cambiar la zona de sesión. Validar acceso de administrador activo con MFA y rechazo de administrador inactivo, sin MFA, roles móviles y anónimo. Aplicar, revertir y reaplicar las migraciones. |
| Vitest | Contrato de datos, orden de fechas, etiquetas, enlaces con el corte devuelto por SQL y casos de medianoche de Lima y cambio de mes o año. Probar valores cero y rechazo de una respuesta incompleta. |
| Playwright en Edge | Ingresar con MFA, comparar tarjetas con datos sintéticos conocidos, abrir Viajes e Incidencias con el rango correcto y volver al Dashboard. Probar tabla accesible, semana vacía y fallo de la nueva RPC con el resumen existente disponible. Ejecutar la regresión completa, incluidas las pruebas actuales de indicadores de gestión y Exportación. |
| Revisión visual | Comparar antes y después del Dashboard. Revisar escritorio, 360 y 320 px, reflujo equivalente al 200 %, teclado, foco visible y cifras largas. Guardar capturas de escritorio y móvil. |
| Equivalencia entre módulos | Comparar los totales de viajes e incidencias de cada enlace con su módulo. Reconstruir las subidas por viaje con el mismo criterio de Asistencia y comparar la serie con los totales de Viajes de cada fecha. |

## 6. Velocidad y carga

- Medir antes y después el Dashboard, Viajes, Asistencia e Incidencias en compilación de producción con el mismo Supabase local. Usar **10.000 viajes y 100.000 eventos sintéticos**, fechas repartidas dentro y fuera de la ventana, y un día de alta actividad con subidas y anulaciones. Mantener datos sintéticos de alumnos, apoderados y carnets para que el resumen existente esté representado.
- Medir la carga del Dashboard, su RPC actual y la operativa, tanto con la semana poblada como con una semana vacía. Calentar cada escenario y tomar 30 solicitudes con una sesión MFA y 30 con cinco sesiones MFA independientes. Registrar p50, p95, errores y validación de valores. Usar TTFB para páginas y latencia HTTP completa para RPC.
- Mantener **300 ms p95 con una sesión**, **600 ms con cinco** y **100 ms p95 por RPC**, con cero errores inesperados. Guardar planes de ejecución y búferes, repetir las mediciones si se ajusta la consulta o el índice, y documentar los aumentos sostenidos de latencia. [Línea de referencia de Incidencias](informes/etapa10-incidencias.md)

## 7. Hallazgos y cierre

Crear `docs/web/informes/etapa11-dashboard-operativo.md` con entorno, comandos, datos sintéticos, capturas, resultados por suite y métricas antes y después. Para cada bug registrar severidad, pasos, resultado esperado y observado, evidencia, corrección y estado. Agregar regresiones para fallos corregidos de conteos, permisos, navegación, errores parciales y reflujo.

Cerrar con lint, Vitest, SQL, Playwright, build y presupuestos aprobados. En validación, aplicar primero la migración y publicar después la web. Comprobar con una cuenta de administrador con MFA que los indicadores coincidan con sus módulos. Para revertir, retirar primero la versión web y ejecutar después el rollback SQL.

## 8. Skills recomendadas

| Tarea | Skill |
|---|---|
| Elaboración del plan, criterios de aceptación y orden de verificación | `agentic-engineering` |
| Continuidad visual, gráficas y accesibilidad | `impeccable` con la guía `shape` y `accessibility` |
| Consultas en servidor, composición y navegación con Next.js | `vercel-react-best-practices` |
| Agregados, permisos e índices de Supabase | `supabase-postgres-best-practices` y `security-and-hardening` |
| Línea base, carga y diagnóstico de latencia | `benchmark` y `performance` |
| Comprobación en navegador, hallazgos y regresiones | `browser-qa` y `code-review-and-quality` |
