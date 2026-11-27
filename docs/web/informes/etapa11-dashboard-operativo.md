# Dashboard operativo · validación local

**27 de noviembre de 2026.** Windows, Node 26.13.1, Edge, Next.js 16.4.6 en modo producción y Supabase local en Docker con PostgreSQL 17.6. Las pruebas usaron datos sintéticos y cuentas locales con MFA.

## Alcance comprobado

- La ruta `/` presenta **Operación del transporte** debajo de gestión. Reutiliza las tarjetas, grilla, botones, tipografía y convenciones de gráficas del panel. La gráfica muestra siete días en orden ascendente, con ceros para los días sin viajes, descripción accesible y una tabla nativa con el desglose.
- La migración 048 incorpora una RPC de solo lectura para administradores activos con MFA. Devuelve solo fechas y agregados. La fecha de Lima determina los enlaces, la ventana semanal y el día de cada evento según `trip_date`.
- SQL verificó la equivalencia con Viajes para cada día y estado, con el detalle de los viajes y Asistencia para las subidas únicas, y con Incidencias para las ausencias y anulaciones. Incluyó doble registro por QR y manual, alumno de baja, bus inactivo y eventos procesados después de medianoche.

## Pruebas

| Verificación | Resultado |
|---|---|
| `npm.cmd run lint` | Aprobado |
| `npm.cmd test` | 57 pruebas aprobadas en 10 archivos. Incluye fechas inválidas, conteos incompletos, cambio de año y el corte al cruzar medianoche de Lima |
| `npm.cmd run build` | Aprobado, con verificación de TypeScript |
| `supabase/tests/etapa*.sql` | 17 suites aprobadas con `psql -v ON_ERROR_STOP=1` tras ejecutar `etapa1_roles.sql` primero |
| Migración 048 | Aplicada, revertida y reaplicada en Supabase local. Verificados administrador activo, inactivo, sin MFA, anónimo y roles móviles |
| Playwright en Edge | 62 casos aprobados en la regresión completa del panel. Los seis casos del Dashboard operativo y de gestión volvieron a pasar en la compilación de entrega |
| Estados en Edge | La semana vacía mostró los cuatro indicadores y los siete días en cero. Al revertir la 048, gestión siguió disponible con un aviso de error en Operación. Tras reaplicar la migración y comprobar su disponibilidad en PostgREST, el botón **Reintentar** recuperó el resumen |

Playwright usó la configuración del repositorio con un ajuste local de `baseURL` y `webServer` al puerto 3044 para probar el resultado de `next start` con la cuenta de pruebas con MFA.

## Revisión visual y accesibilidad

Edge comprobó 1.280, 640, 360 y 320 px. El ancho de 640 px reproduce el espacio disponible al 200 % sobre 1.280 px. Se revisaron el foco por teclado sobre la barra móvil y el ajuste de conteos de hasta 16 dígitos inyectados temporalmente en la vista. Axe-core, con reglas WCAG A/AA, no detectó infracciones en los cuatro anchos con la tabla abierta. Durante ese recorrido hubo cero errores de página o de consola y cero respuestas HTTP 4xx/5xx. Las muestras locales de navegador dieron LCP de 320 a 708 ms, CLS de 0 y una interacción de 24 a 56 ms al abrir la tabla.

- Gestión antes y después en [escritorio antes](evidencia-dashboard-operativo/antes-1280.png), [escritorio después](evidencia-dashboard-operativo/despues-1280.png), [móvil antes](evidencia-dashboard-operativo/antes-320.png) y [móvil después](evidencia-dashboard-operativo/despues-320.png).
- Indicadores y tabla en [escritorio](evidencia-dashboard-operativo/operacion-1280.png) y [móvil](evidencia-dashboard-operativo/operacion-320.png).
- [Semana vacía](evidencia-dashboard-operativo/semana-vacia.png) y [fallo parcial](evidencia-dashboard-operativo/fallo-parcial.png).

## Hallazgos y correcciones

| Severidad | Reproducción | Resultado observado y esperado | Corrección y evidencia |
|---|---|---|---|
| Media | Consultar la RPC con 100.000 eventos y un viaje de 9.990 registros el día de corte | La primera consulta recorría todos los eventos. Se esperaba que el trabajo dependiera de los viajes del día | La agregación por viaje usa los índices existentes. El plan pasó de 1.762 a 1.200 accesos a búferes compartidos y de 42,0 a 27,0 ms en la comparación. La RPC pasó de 47,4 a 28,4 ms p95 con cinco sesiones en las primeras tandas. [Planes comparados](evidencia-dashboard-operativo/explain-comparativo.txt) |
| Baja | Abrir la tabla de viajes a 320 px | El encabezado «Cerrados» partía la palabra. Se esperaba mantenerla en una línea | Se ajustó el ancho de las columnas y el tamaño de las etiquetas de la gráfica en móvil. Playwright verifica el encabezado y el reflujo. [Captura móvil](evidencia-dashboard-operativo/operacion-320.png) |
| Baja | Mostrar una ausencia y una anulación en la tarjeta de Incidencias | El texto aplicaba el plural a ambos conteos | Se ajustó el singular de ambos términos y se verificó con la prueba de navegación de Edge |

## Carga y método de medición

Se generaron 10.000 viajes repartidos en 90 días y 100.000 eventos. Se incluyeron 1.242 viajes en la semana, con 178 el día de corte, y un viaje de 9.990 eventos ese día. La carga añadió 2.000 beneficiarios, 1.000 apoderados con vínculos y 1.500 carnets con distintos estados y años. El corte poblado comprobó 2 viajes en curso, 176 cerrados, 6.271 subidas y 5.189 incidencias, de las cuales 126 eran ausencias y 5.063 anulaciones.

Se midieron compilaciones de producción con la misma base y cinco sesiones MFA independientes. Cada escenario recibió tres tandas de calentamiento y 30 solicitudes medidas por nivel de concurrencia. En páginas se midió el TTFB y en RPC se midió la respuesta HTTP completa. Se comprobó el contenido de cada respuesta con conteos SQL independientes o con los marcadores del módulo correspondiente. Para la semana vacía se trasladaron temporalmente las fechas de los viajes sintéticos 120 días, manteniendo el volumen de gestión y de eventos.

Los límites del plan son p95 de 300 ms con una sesión y 600 ms con cinco para páginas. Las RPC tienen un límite de 100 ms p95. El plan comparativo usó `EXPLAIN (ANALYZE, BUFFERS)` sobre la consulta interna. La consulta final usa `idx_bus_trips_admin_date` e `idx_bus_attendance_trip_scanned`. Con la semana vacía la búsqueda de asistencia no se ejecutó y el plan completó en 0,98 ms. [Plan de semana vacía](evidencia-dashboard-operativo/explain-vacia.txt)

### Antes y después

Cada celda contiene p50 / p95 en milisegundos. En estas tandas hubo cero errores en cada escenario.

| Escenario | Antes · 1 sesión | Entrega · 1 sesión | Antes · 5 sesiones | Entrega · 5 sesiones |
|---|---:|---:|---:|---:|
| Dashboard, semana poblada | 33,1 / 56,2 | 35,2 / 40,7 | 88,8 / 120,0 | 129,8 / 217,0 |
| RPC gestión, semana poblada | 11,5 / 15,4 | 14,7 / 19,6 | 20,1 / 23,2 | 27,5 / 37,8 |
| RPC operación, semana poblada | — | 17,4 / 25,0 | — | 24,0 / 28,1 |
| Dashboard, semana vacía | 29,1 / 61,8 | 38,6 / 72,3 | 77,0 / 92,9 | 119,9 / 148,7 |
| RPC gestión, semana vacía | 11,1 / 16,2 | 14,3 / 20,8 | 19,5 / 23,6 | 21,2 / 23,0 |
| RPC operación, semana vacía | — | 4,5 / 5,4 | — | 6,7 / 7,9 |
| Viajes | 31,0 / 45,4 | 27,1 / 32,6 | 116,7 / 138,1 | 76,4 / 94,6 |
| Detalle de viaje | 28,7 / 38,7 | 21,7 / 26,8 | 85,7 / 104,3 | 71,0 / 85,2 |
| Asistencia | 26,2 / 30,7 | 32,4 / 58,9 | 84,9 / 112,5 | 114,0 / 205,2 |
| Incidencias | 29,6 / 37,5 | 41,9 / 64,3 | 80,5 / 102,0 | 96,7 / 113,8 |

Una segunda tanda de la compilación de entrega, tras restablecer la conexión a Docker Desktop, volvió a completar 30 solicitudes por escenario y concurrencia con cero errores. Con cinco sesiones, el Dashboard registró 116,2 ms p95 en la semana poblada y 95,2 ms en la vacía. La RPC operativa dio 26,3 y 8,2 ms p95 respectivamente. Asistencia pasó de 205,2 a 140,4 ms p95 entre las dos tandas de entrega, con una línea base de 112,5 ms. Incidencias marcó 113,8 y 116,6 ms p95 en esas tandas, con una línea base de 102,0 ms. Las dos tandas cumplieron todos los límites del plan.

## Publicación y reversión

Aplicar `048_admin_dashboard_operativo.sql` antes de publicar la web. Con una cuenta de administrador con MFA, abrir `/` y contrastar las tarjetas y el rango semanal con Viajes e Incidencias. Para revertir, retirar primero la versión web y ejecutar después `048_rollback.sql`. Esta validación se hizo en la instancia local.
