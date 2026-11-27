# Plan de implementación de Exportación

**Estado** Implementado y validado en local. La migración 045 quedó aplicada en Supabase local. Incidencias e indicadores adicionales del Dashboard quedan para entregas posteriores. [Informe de Exportación](informes/etapa9-exportacion.md) · [Plan de Asistencia](13-plan-asistencia-por-alumno.md)

La siguiente entrega reúne las excepciones de asistencia ya registradas por la operación. [Plan de Incidencias](15-plan-incidencias.md)

## 1. Objetivo y alcance

Un administrador activo con MFA puede descargar un CSV compatible con hojas de cálculo desde las pantallas que ya usa para consultar viajes y asistencia.

| Pantalla | Qué descarga | Columnas previstas |
|---|---|---|
| Listado de Viajes | Todos los viajes que coinciden con las fechas, el bus, el turno, el sentido y el estado aplicados | Fecha, bus, turno, sentido, estado, inicio y cierre |
| Detalle de un viaje | Todos los eventos del viaje abierto, incluidas anulaciones | Fecha del viaje, bus, turno, sentido, alumno, evento, hora registrada, operador, estado de anulación y motivo |
| Asistencia por alumno | Todos los eventos del alumno de la ficha que coinciden con las fechas, el turno y el tipo de evento aplicados | Fecha del viaje, bus, turno, sentido, alumno, evento, hora registrada, estado de anulación y motivo |

El CSV respeta el orden de la consulta y abarca todas las páginas del resultado filtrado. Se conserva el historial de alumnos dados de baja y de viajes de buses inactivos. Cada fila representa un viaje o un evento según el origen. Los contadores del panel mantienen sus reglas actuales.

**Decisiones propuestas para esta entrega.** Un CSV por descarga, hasta 10.000 filas, desde las pantallas existentes. Si el resultado supera el límite, se pide acotar los filtros y se conserva la consulta abierta. El alcance se limita a los campos operativos de la tabla anterior.

## 2. Regla permanente de diseño y arquitectura

Antes de crear o cambiar cualquier pantalla, revisar las pantallas equivalentes del panel y sus componentes. Reutilizar la paleta azul y clara, Manrope, la jerarquía tipográfica, el espaciado, los iconos existentes y las clases `ad-*` de `globals.css` y `admin.css`. Los botones, mensajes, estados vacíos, foco y comportamiento móvil siguen los patrones actuales. Consultar Viajes y Asistencia para ubicar el control, Auditoría para la relación con los filtros y Carnets QR para el flujo de descarga.

Mantener el App Router, las páginas de servidor, la organización de consultas y esquemas, el cliente Supabase y la autorización existentes. La entrega agrega la acción **Descargar CSV** a las pantallas actuales. Las rutas de descarga quedan junto a sus módulos y reutilizan la lógica de consulta de cada vista.

- Mostrar el botón junto a los filtros aplicados o en la cabecera del detalle. Cuando el formulario tenga cambios por aplicar, la descarga sigue los filtros de la URL y del listado visible.
- Mantener el alumno o viaje, los filtros y la página al descargar, cancelar o reintentar. Mostrar el estado de preparación, prevenir clics duplicados mientras se procesa la solicitud y presentar errores junto al botón.
- Mostrar un aviso si el rango es inválido, el resultado es vacío, se supera el límite, vence la sesión o falla la consulta. El usuario puede corregir el filtro y reintentar.
- Revisar escritorio, móvil a 360 y 320 px, reflujo al 200 % y teclado. Verificar que la barra móvil deje visible el control enfocado.

## 3. Implementación

1. **Fijar el contrato y medir la línea base.** Revisar `web/AGENTS.md`, la documentación local de Next.js y las consultas de Viajes y Asistencia. Definir pruebas de equivalencia de filas y capturar la velocidad de las tres pantallas antes de editar.
2. **Reutilizar filtros y permisos.** Validar con Zod el identificador y los filtros en el servidor. Usar los mismos catálogos, valores por defecto, límites inclusivos en fechas de Lima y formato de horas de las páginas. “Subidas” incluye QR y manual. “Subidas manuales” incluye solo eventos manuales. Verificar la sesión, el administrador activo y `aal2` antes de generar la descarga. Aplicar el patrón de `requireAdminAction()` con el cliente de sesión existente y repetir el control de acceso en Supabase.
3. **Extraer datos con límite.** Reutilizar en Supabase los predicados y el orden de las consultas operativas. Mantener el tamaño normal de 20 filas para la navegación. Para la descarga, usar una consulta acotada a 10.001 filas para detectar exceso antes de enviar el archivo y obtener un conjunto consistente bajo escrituras concurrentes. Medir con los índices existentes y agregar un índice solo si los planes y mediciones muestran una mejora. Incluir en `supabase/pending/` las migraciones necesarias y su rollback.
4. **Preparar y enviar el archivo.** Generar CSV UTF-8 con BOM, delimitador de punto y coma, encabezados en español, fechas y horas de Lima. Escapar delimitadores, comillas y saltos de línea. Neutralizar las celdas de texto que una hoja de cálculo pueda interpretar como fórmulas, incluidas las que empiezan con caracteres de control o espacios antes del prefijo. Enviar como adjunto con nombre previsible, `Content-Type` de CSV y `Cache-Control: private, no-store`. Usar una solicitud explícita que mantenga la vista y reservar memoria según el límite de filas y el tamaño de los campos.
5. **Registrar la operación.** Usar el mecanismo de auditoría de Carnets QR y `admin_audit_log`. Registrar el actor, la fecha, el origen, el identificador del contexto cuando aplique, los filtros permitidos y la cantidad de filas cuando el archivo quede preparado. Limitar la auditoría a metadatos. La preparación exitosa y su registro deben completarse antes de entregar el adjunto. El archivo omite DNI, teléfonos, direcciones, QR, coordenadas e identificadores internos de personas. Las respuestas de error conservan el contexto y muestran mensajes del panel.
6. **Integrar, verificar y documentar.** Añadir el botón y sus estados en las vistas actuales. Ejecutar las pruebas de abajo y cerrar el informe con los resultados medidos y los defectos encontrados.

## 4. Pruebas de aceptación y regresión

| Prueba | Evidencia requerida |
|---|---|
| SQL en Supabase local | Verificar administrador activo con `aal2` y rechazo para administrador inactivo, sin MFA, roles móviles y anónimo. Cubrir aislamiento por alumno o viaje, filtros combinados, fechas inclusivas, hora después de medianoche, anulaciones, orden estable y límites de 0, 10.000 y 10.001 filas. Confirmar qué solicitudes generan auditoría. Aplicar, revertir y reaplicar las migraciones. |
| Vitest | Validar parámetros, nombre del archivo, columnas, UTF-8, tildes, comillas, saltos de línea, campos vacíos y contenido que una hoja de cálculo trataría como fórmula. Verificar que cambiar de página mantenga el conjunto exportado y que solo cambie al aplicar filtros. |
| Playwright en Edge | Entrar con MFA y descargar desde los tres puntos de entrada. Inspeccionar el nombre y contenido del archivo, incluidas las filas de páginas posteriores. Cubrir alumno de baja, filtro vacío, error de consulta, límite excedido, sesión vencida y reintento. Confirmar que la URL y los filtros se conservan, y ejecutar la regresión completa del panel. |
| Revisión visual y de teclado | Comparar las pantallas con Viajes, Asistencia, Auditoría y Carnets QR. Guardar capturas de escritorio y móvil. Verificar orden de foco, mensajes de estado, textos largos y ausencia de desbordes laterales o controles tapados por la barra inferior. |
| Compatibilidad del archivo | Abrir un CSV sintético en una hoja de cálculo con configuración regional de Perú. Verificar columnas, acentos, saltos de línea, fechas y hora, y que el texto se mantenga como datos. Registrar la aplicación y la configuración usadas. |

## 5. Velocidad y carga

- Medir antes y después el listado de Viajes, el detalle de viaje, la pestaña de Asistencia y la vista Datos del alumno. Usar compilación de producción y Supabase local con el mismo conjunto sintético de **10.000 viajes y 100.000 eventos**, con al menos 500 eventos para un alumno y 500 en un viaje de detalle.
- Medir las descargas de los tres orígenes con resultados habituales y cercanos al límite. Incluir la descarga de Viajes con 10.000 filas y comprobar el rechazo de un resultado de 10.001. Hacer 30 solicitudes por escenario tras el calentamiento con una sesión MFA y con cinco sesiones MFA independientes.
- Registrar p50, p95, errores, filas, tamaño del CSV, tiempo al primer byte, tiempo hasta recibir el archivo completo, latencia de la RPC y memoria máxima del proceso. Incluir una tanda mixta con descargas y consultas del panel. Ejecutar `EXPLAIN (ANALYZE, BUFFERS)` sobre las consultas de exportación y comparar los cambios con la línea base.
- Mantener como metas para las páginas **300 ms p95 con una sesión y 600 ms con cinco**, y **100 ms p95 por RPC de navegación**. Para el CSV al límite se proponen **2 s p95 de descarga completa con una sesión y 5 s con cinco**, con cero errores inesperados. Informar la variación observada en las pantallas existentes y repetir las mediciones si aparece una degradación sostenida.

## 6. Hallazgos y cierre

Registrar los resultados en `docs/web/informes/etapa9-exportacion.md` con el entorno, los comandos, el volumen, las métricas antes y después, las capturas y el resultado por suite. Para cada bug anotar severidad, ambiente, pasos de reproducción, comportamiento esperado, observado, evidencia, corrección y estado. Corregir y volver a probar los fallos de permisos, fuga de campos, integridad del CSV, auditoría, conservación de filtros y accesibilidad. Agregar cobertura de regresión para los casos corregidos.

Cerrar con lint, Vitest, SQL, Playwright, compilación de producción y presupuestos de rendimiento aprobados. En validación, aplicar las migraciones primero, publicar la web y descargar un CSV de cada origen con una cuenta de prueba con MFA. Para revertir, retirar primero la versión web que usa las consultas nuevas y después ejecutar los rollbacks. Conservar las entradas de auditoría ya generadas.

## 7. Skills recomendadas

| Tarea | Skill |
|---|---|
| Preparación de este plan, criterios de aceptación y secuencia de verificación | `agentic-engineering` |
| Continuidad visual y revisión de pantallas existentes | `impeccable`, con la guía `shape` para revisar el enfoque |
| Botón, estados y rutas de Next.js | `vercel-react-best-practices` y `accessibility` |
| Consultas, límites, auditoría y protección de datos | `supabase-postgres-best-practices` y `security-and-hardening` |
| Línea base, carga y análisis de latencia | `benchmark` y `performance` |
| Regresión de navegador y revisión del cambio | `browser-qa` y `code-review-and-quality` |
