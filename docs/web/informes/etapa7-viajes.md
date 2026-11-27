# Viajes web · validación local

**Fecha** 27 de noviembre de 2026. **Entorno** Windows, Edge, Next.js en modo producción para las mediciones y Supabase local en Docker. Todos los datos de la prueba fueron sintéticos. La migración se validó en local. El despliegue externo quedó pendiente.

## Alcance verificado

- Listado de los últimos siete días de Lima, filtros combinados, paginación y retorno al listado con el contexto de búsqueda.
- Detalle de viaje con asistencias manuales y anuladas, resumen por alumno y acceso a su ficha. Los anulados aparecen en el historial y quedan fuera de los totales.
- Acceso restringido a administrador activo con MFA en las páginas y en las tres RPC. La 041 y la 042 se aplicaron, revirtieron y reaplicaron en local.
- Se compararon las capturas del listado con Auditoría y las del detalle con la ficha de Alumnos. El módulo hereda Manrope, colores, controles, tablas, tarjetas y navegación del panel. Se revisaron ambos recorridos a 1280, 640, 360 y 320 px. Los 640 px cubren el ancho de reflujo equivalente al 200 % sobre 1280 px. Se verificaron el salto al contenido y el foco visible del primer campo.

Pasaron las **13 suites SQL** del panel, las **25 pruebas de Vitest** y las **44 pruebas de Playwright en Edge**, incluidas las cinco de Viajes. ESLint y la compilación de producción terminaron correctamente.

## Rendimiento

Cada caso tuvo 30 solicitudes medibles, después de calentar las rutas, con sesiones autenticadas y la compilación de producción. El volumen principal fue de **10.000 viajes y 100.000 eventos**, con 500 eventos en el viaje de detalle. El ensayo preliminar con 30 viajes y 300 eventos dio p95 de 25 a 37 ms. Las cifras de este entorno incluyen la latencia local entre Next.js y Supabase.

| Caso con 10.000 viajes | TTFB p50 / p95, una sesión | TTFB p50 / p95, cinco sesiones |
|---|---:|---:|
| Listado inicial | 29 / 36 ms | 98 / 123 ms |
| Filtro por bus y sentido | 30 / 39 ms | 73 / 84 ms |
| Listado, página 100 | 25 / 30 ms | 72 / 81 ms |
| Detalle | 22 / 25 ms | 67 / 86 ms |
| Detalle, página 2 | 20 / 25 ms | 64 / 68 ms |

La tanda final de 300 solicitudes de página terminó con cero errores. El p95 de las RPC fue de **5 a 7 ms**. Se cumplieron los presupuestos de 300 ms para una sesión, 600 ms para cinco sesiones y 100 ms por RPC.

Antes de la 042, `EXPLAIN (ANALYZE, BUFFERS)` mostró recorridos secuenciales que descartaban 9.805 viajes o 99.500 asistencias en las consultas que seleccionan una página. Con los índices concurrentes, las consultas ordenadas usaron los índices correspondientes. La RPC de detalle pasó de **17,37 a 3,29 ms** en el plan de ejecución local y su p95 vía HTTP pasó de **21 a 6 ms**. El p95 de la página de detalle para una sesión pasó de 58 a 25 ms.

El p95 de Auditoría y Alumnos fue de 60 y 36 ms antes del cambio, y de 34 y 22 ms en el control posterior con el entorno local de prueba. Estas cifras se registraron como control de regresión, con una carga de fondo variable.

## Hallazgos y correcciones

| Severidad | Caso y evidencia | Resultado esperado | Estado |
|---|---|---|---|
| Media | Seleccionar `mañana` y abrir el detalle. La validación interpretaba el texto visible de la opción como valor válido y perdía el filtro. | Conservar la clave del turno en todas las URL. | Corregido con las claves del catálogo. Prueba de Vitest aprobada. |
| Media | Abrir un viaje con un apellido de 144 caracteres sin espacios a 640 px. El ancho del documento llegó a 1.443 px. | El nombre se ajusta al ancho de la tarjeta y la página conserva su ancho. | Corregido. El documento pasó a 640 px y mantuvo el ancho también a 360 y 320 px. Se agregó una regresión en Playwright. |
| Media | Abrir el detalle con 100.000 eventos almacenados. La consulta de página recorría registros de otros viajes y el p95 HTTP de la RPC era de 21 ms. | Acceder al conjunto de filas del viaje y su orden mediante un índice. | Corregido en 042 y medido de nuevo. |
| Baja | Ejecutar seguidas las pruebas de Viajes. Una fixture dejaba el estado del alumno referenciando el viaje, y la fecha leída de `psql` incluía un salto de línea. | Limpieza repetible y fechas comparables en la prueba. | Corregido. La limpieza borra primero el estado de la fixture y la fecha se normaliza. |

## Despliegue y reversión

1. Aplicar [041](../../../supabase/pending/041_admin_trips.sql) y después [042](../../../supabase/pending/042_admin_trips_indexes.sql) en el entorno de validación. Ejecutar las sentencias de la 042 fuera de una transacción y verificar que ambos índices queden válidos. Si una ejecución interrumpida deja un índice inválido, ejecutar su rollback y repetir la 042.
2. Publicar la web en ese entorno. Con un administrador con MFA, comprobar el listado de siete días, el detalle de un viaje autorizado y la respuesta de un filtro sin resultados.
3. Para revertir, retirar primero la versión web que usa las consultas. Ejecutar [042 rollback](../../../supabase/pending/042_rollback.sql) y [041 rollback](../../../supabase/pending/041_rollback.sql), en ese orden.
