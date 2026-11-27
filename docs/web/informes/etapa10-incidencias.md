# Incidencias · validación local

**27 de noviembre de 2026.** Windows, Node 26.13.1, Supabase local en Docker con PostgreSQL 17.6 y compilaciones de producción de Next.js. Se usaron datos sintéticos y cuentas locales de prueba.

## Alcance y resultados

- La consulta reúne ausencias vigentes y eventos anulados. Una ausencia anulada aparece una sola vez como evento anulado. El historial incluye alumnos dados de baja y buses inactivos.
- Se probó una anulación después de la medianoche de Lima. El registro mantuvo la fecha del viaje para los filtros y mostró la fecha completa de anulación. Se comprobó el operador original, el responsable de anulación y los estados de datos faltantes.
- La página y la RPC exigen un administrador activo con MFA. SQL verificó el rechazo de administrador sin MFA o inactivo, roles móviles y anónimo. La RPC devolvió los campos operativos y los identificadores necesarios para abrir el viaje o la ficha.
- Se aplicaron, revirtieron y reaplicaron la 046 y la 047. La reversión retiró la RPC y el índice. Durante la prueba de indisponibilidad, Edge mostró el aviso y conservó el filtro. También se comprobó el historial vacío tras reaplicar las migraciones.
- Pasaron las 16 suites SQL y las 48 pruebas de Vitest. En Edge pasaron los 60 casos de la regresión completa del panel, incluidos Viajes, Asistencia, Exportación e Incidencias.
- Tras los ajustes de interfaz, pasaron lint, la compilación de producción y los cuatro casos de Incidencias en la compilación final. Las comprobaciones nuevas de ancho de columna y vínculo accesible del error fallaron en la versión previa y pasaron en la final.

## Revisión visual

La pantalla reutiliza los filtros y avisos de Auditoría, la tabla y tarjetas de Viajes, y las etiquetas y enlaces de Asistencia. Se verificaron escritorio a 1.280 px, reflujo a 640 px equivalente al 200 % sobre 1.280 px y móvil a 360 y 320 px. Los nombres y motivos de prueba se ajustaron al ancho disponible. La navegación por teclado mantuvo el filtro enfocado por encima de la barra móvil. [Escritorio a 1.280 px](evidencia-incidencias/escritorio-1280.png) · [Móvil a 320 px](evidencia-incidencias/movil-320.png)

## Rendimiento

La línea base y el control posterior usaron el mismo conjunto de **10.000 viajes, 100.000 eventos y 10.000 movimientos de auditoría**. Entre los eventos hubo 17.126 ausencias vigentes y 8.886 anulaciones. Los siete días iniciales reunieron 7.243 incidencias, incluidas 5.000 anulaciones en un solo viaje. Se calentó cada consulta y se midieron 30 solicitudes con una sesión MFA y 30 en tandas de cinco sesiones independientes. Se comprobaron el estado HTTP, los totales, la cantidad de filas por página y, en la RPC, la identidad y el orden de las filas.

### Incidencias con el índice

| Caso | Total | TTFB p50 / p95 con una sesión (ms) | TTFB p50 / p95 con cinco (ms) | RPC p50 / p95 con una (ms) | RPC p50 / p95 con cinco (ms) |
|---|---:|---:|---:|---:|---:|
| Semana inicial | 7.243 | 44,8 / 102,2 | 105,1 / 132,2 | 12,2 / 14,3 | 17,6 / 22,6 |
| Ausencias | 1.776 | 37,3 / 69,2 | 150,3 / 437,4 | 12,2 / 38,7 | 16,6 / 23,3 |
| Anulaciones | 5.467 | 52,3 / 116,5 | 145,6 / 165,3 | 22,2 / 32,3 | 23,6 / 30,7 |
| Fechas, bus, turno y tipo | 135 | 33,4 / 43,3 | 94,4 / 132,9 | 7,5 / 10,9 | 14,1 / 18,1 |
| Página 100 | 7.243 | 38,7 / 75,4 | 177,4 / 280,9 | 16,1 / 22,8 | 21,7 / 26,1 |
| Sin resultados | 0 | 21,2 / 31,6 | 80,2 / 100,8 | 8,7 / 11,0 | 10,6 / 14,1 |

La tabla usa los tiempos de página de la compilación final y los tiempos de la RPC con la misma consulta e índice. La semana inicial alcanzó 303,1 ms p95 con una sesión en la primera tanda de la compilación final. Se repitió ese escenario con la misma carga y bajó a 102,2 ms. Los máximos p95 de la serie de cierre fueron **116,5 ms con una sesión**, **437,4 ms con cinco** y **38,7 ms por RPC**, frente a metas de 300, 600 y 100 ms. Las 1.140 solicitudes al módulo con el índice terminaron sin errores, incluidas las tandas previas y la repetición.

### Controles del panel

Las cuatro páginas se midieron por TTFB. Los dos controles de CSV se midieron hasta recibir el archivo completo.

| Control | Antes, una sesión p50 / p95 (ms) | Después, una (ms) | Antes, cinco (ms) | Después, cinco (ms) |
|---|---:|---:|---:|---:|
| Listado de Viajes | 26,4 / 33,4 | 23,5 / 27,5 | 80,3 / 103,6 | 83,7 / 132,0 |
| Detalle de viaje | 21,4 / 29,1 | 20,8 / 35,8 | 65,4 / 89,8 | 59,2 / 63,7 |
| Asistencia por alumno | 28,5 / 36,6 | 25,5 / 35,2 | 137,5 / 149,4 | 93,0 / 173,2 |
| Auditoría | 24,2 / 32,8 | 25,0 / 29,7 | 78,7 / 145,1 | 69,8 / 79,2 |
| CSV del viaje, 500 filas | 95,0 / 113,1 | 118,7 / 149,7 | 179,4 / 208,4 | 236,1 / 277,4 |
| CSV de alumno, 500 filas | 90,2 / 116,6 | 118,3 / 169,0 | 206,1 / 245,2 | 202,9 / 225,2 |

Los controles sumaron 1.080 solicitudes sin errores contando la línea base y las dos tandas posteriores. Los dos CSV conservaron 500 filas y el mismo tamaño. En la compilación final, el p95 del listado de Viajes y del CSV de viaje subió 28,4 y 69,0 ms con cinco sesiones, respectivamente. Los controles quedaron dentro de los presupuestos de sus entregas.

### Comparación del índice

| Caso RPC | Sin índice p95 con una / cinco sesiones (ms) | Con índice p95 con una / cinco (ms) |
|---|---:|---:|
| Semana inicial | 20,7 / 41,8 | 14,3 / 22,6 |
| Ausencias | 44,8 / 48,2 | 38,7 / 23,3 |
| Anulaciones | 30,8 / 46,2 | 32,3 / 30,7 |
| Fechas, bus, turno y tipo | 30,0 / 60,1 | 10,9 / 18,1 |
| Página 100 | 90,5 / 53,3 | 22,8 / 26,1 |
| Sin resultados | 7,1 / 10,1 | 11,0 / 14,1 |

Las 360 solicitudes sin índice también terminaron sin errores. `EXPLAIN (ANALYZE, BUFFERS)` mostró un recorrido secuencial que descartaba 73.988 eventos en la semana inicial. El índice candidato leyó las 26.012 filas elegibles con `Index Only Scan`. La consulta interna pasó de 19,610 a 16,050 ms y el nodo raíz pasó de 1.844 a 486 accesos a búferes compartidos. Con filtros combinados pasó de 27,455 a 2,006 ms usando el índice por viaje. La página 100 pasó de 27,561 a 15,197 ms. [Plan sin índice](evidencia-incidencias/explain-sin-indice.txt) · [Plan con índice](evidencia-incidencias/explain-con-indice.txt)

## Hallazgos

| Severidad | Pasos | Esperado | Observado y evidencia | Estado |
|---|---|---|---|---|
| Media | Consultar la semana inicial y los filtros combinados sobre 100.000 eventos antes de la 047 | Acceso selectivo a registros de incidencias | La consulta inicial descartó 73.988 eventos. La RPC combinada obtuvo p95 de 60,1 ms con cinco sesiones | Corregido con el índice parcial de la 047. La RPC combinada bajó a 18,1 ms y se verificaron las filas y el orden antes y después |
| Baja | Abrir una anulación con nombre y motivo largos a 1.280 px | El bus y el turno conservan espacio para leerse | La columna Viaje se redujo a 87,2 px en Edge y el código del bus quedó dividido en varias líneas | Se reservó un mínimo de 9 rem y se agregó una comprobación de ancho en Playwright |
| Baja | Abrir la consulta con `desde=2036-02-30` y enfocar el campo Desde | El campo se identifica como inválido y su descripción incluye el error | El aviso aparecía, pero el campo carecía de `aria-invalid` y de una descripción asociada | Se reutilizó el patrón de validación de Asistencia y se agregó una comprobación en Playwright |

## Reproducción, publicación y reversión

En Supabase local, aplicar [046](../../../supabase/pending/046_admin_incidents.sql) y [047](../../../supabase/pending/047_admin_incidents_index.sql). La 047 se ejecuta fuera de una transacción. Verificar que el índice quede válido y ejecutar `supabase/tests/etapa10_incidencias.sql` con psql y `ON_ERROR_STOP=1` después de `etapa1_roles.sql`.

Desde `web/`, ejecutar `npm run lint`, `npm test`, `npm run build` y `npm run e2e`. Para repetir las mediciones, servir la compilación con `npm run start` y usar sesiones MFA sobre el mismo conjunto sintético en ambas tandas.

Para esta validación se alineó temporalmente la contraseña de la cuenta local de prueba y se usó su factor MFA inscrito. Al terminar se restauró la contraseña original y se retiró el conjunto sintético de medición.

Para publicar en validación, aplicar la 046 y la 047 antes de publicar la web. Probar una ausencia y una anulación con una cuenta de administrador con MFA. Para revertir, retirar primero la versión web y ejecutar [047 rollback](../../../supabase/pending/047_rollback.sql) fuera de una transacción, seguido de [046 rollback](../../../supabase/pending/046_rollback.sql).
