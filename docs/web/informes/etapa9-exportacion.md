# Exportación de Viajes y Asistencia · validación local

**27 de noviembre de 2026.** Windows, Node 26.13.1, Supabase local en Docker con PostgreSQL 17.6 y compilación de producción de Next.js. Las pruebas usaron datos sintéticos y una cuenta local de administrador con MFA.

## Alcance verificado

- **Descargar CSV** se integra en el listado de Viajes, el detalle de viaje y Asistencia por alumno. La consulta conserva el orden, aplica los filtros visibles en la URL y abarca todas las páginas. El historial de un alumno dado de baja sigue disponible.
- La RPC comprueba que el administrador esté activo y que su JWT tenga `aal2`. La ruta web comprueba la sesión con Auth antes de llamar a la RPC. El adjunto está marcado `private, no-store`.
- El archivo usa UTF-8 con BOM, punto y coma, encabezados en español y fechas y horas de Lima. Las columnas operativas incluyen las anulaciones y excluyen DNI, teléfonos, direcciones, QR, coordenadas e identificadores internos de personas. Se neutralizan celdas que podrían interpretarse como fórmulas.
- La RPC comprueba 10.000 filas y un límite conservador de 4 MiB estimados para el CSV. Con 10.001 filas, la ruta devolvió HTTP 422 sin adjunto ni nueva entrada de auditoría.
- Auditoría muestra **Preparó una exportación CSV** con el origen y el número de filas. La operación registra metadatos antes de enviar el adjunto. Cancelar en el navegador interrumpe la recepción y la preparación ya registrada queda en el historial.
- La migración 045 se aplicó, revirtió y reaplicó en local. La reversión retiró la RPC y los auxiliares, restauró las consultas de Viajes y Asistencia, y conservó las entradas de auditoría. Las suites de Viajes y Asistencia pasaron durante el rollback.
- Pasaron 15 suites SQL, 43 pruebas de Vitest, ESLint y el build. En Edge pasaron los 55 casos de la regresión completa. Tras ajustar el aviso del detalle para archivos grandes, se recompiló en producción y pasaron las seis pruebas de Exportación, incluida la nueva regresión.

## Revisión visual y compatibilidad

Se reutilizó el botón secundario del panel, junto a los filtros en Viajes y Asistencia y en la cabecera de registros del detalle. Se revisaron 1.280, 640, 360 y 320 px. Los 640 px representan el ancho disponible al 200 % sobre 1.280 px. En móvil, el foco de la descarga quedó por encima de la barra inferior. Se verificaron la activación con teclado, el estado pendiente, la cancelación y el reintento. [Escritorio a 1.280 px](evidencia-exportacion/escritorio-1280.png) · [Móvil a 320 px](evidencia-exportacion/movil-320.png)

Excel 16.0, compilación 20625, abrió directamente el archivo descargado en Windows con región Español (Perú), `es-PE`. Importó 10 columnas y 25 filas contando la cabecera. Conservó tildes, comillas, fecha y hora, y un motivo con salto de línea. El valor de prueba que comenzaba con una expresión se importó como texto y Excel indicó que la celda carecía de fórmula.

## Rendimiento

Se usaron **10.000 viajes y 100.000 eventos**. El conjunto incluye un viaje con 500 eventos, otro con 9.990, un alumno con 500 eventos en la semana y otro con 10.000 eventos. Se tomaron 30 solicitudes por combinación tras calentar cada ruta. Las cinco sesiones MFA independientes enviaron cinco solicitudes en paralelo por tanda. Se verificaron el estado HTTP, el contenido y el número de filas esperado. La tanda mixta alternó consultas de Asistencia y descargas de 9.990 filas, con 15 muestras por operación y nivel de concurrencia.

### Páginas del panel

| Página | Antes 1 sesión, TTFB p50 / p95 (ms) | Después 1 sesión (ms) | Antes 5 sesiones (ms) | Después 5 sesiones (ms) |
|---|---:|---:|---:|---:|
| Listado de Viajes | 29,9 / 37,6 | 43,7 / 90,3 | 78,4 / 87,2 | 104,0 / 137,4 |
| Detalle de viaje | 25,5 / 54,2 | 32,4 / 41,0 | 92,4 / 379,5 | 90,6 / 120,5 |
| Asistencia inicial | 31,8 / 54,6 | 32,1 / 46,2 | 118,2 / 127,6 | 106,6 / 124,3 |
| Datos del alumno | 23,2 / 35,7 | 24,9 / 35,4 | 87,0 / 106,5 | 134,4 / 191,8 |

El listado y Datos del alumno registraron mayor p95 en parte de la muestra posterior. El detalle y Asistencia registraron menor p95 en ambas cargas. La RPC de Asistencia pasó de 10,0 a 10,2 ms p95 con una sesión y de 16,6 a 11,9 ms con cinco. Las RPC del listado y del detalle midieron 9,5 y 10,0 ms p95 con cinco sesiones en la tanda posterior. Las páginas cumplieron 300 y 600 ms p95 y las RPC de navegación cumplieron 100 ms p95.

### Archivos CSV

| Consulta | Filas | Bytes CSV | TTFB p50 / p95, 1 sesión (ms) | Total p50 / p95, 1 sesión (ms) | TTFB p50 / p95, 5 sesiones (ms) | Total p50 / p95, 5 sesiones (ms) |
|---|---:|---:|---:|---:|---:|---:|
| Viajes de la semana | 1.242 | 116.243 | 138,4 / 217,9 | 140,5 / 228,6 | 351,4 / 862,8 | 372,2 / 894,2 |
| Viajes al límite | 10.000 | 935.063 | 408,0 / 563,8 | 419,4 / 580,4 | 999,8 / 1.665,4 | 1.158,2 / 1.815,2 |
| Detalle habitual | 500 | 77.531 | 102,8 / 132,7 | 104,0 / 134,2 | 196,3 / 279,6 | 211,6 / 290,4 |
| Detalle cerca del límite | 9.990 | 1.637.392 | 482,6 / 843,1 | 512,2 / 874,6 | 963,9 / 1.306,9 | 1.185,9 / 1.403,4 |
| Alumno habitual | 500 | 65.098 | 98,8 / 158,0 | 99,5 / 159,3 | 180,0 / 200,7 | 192,2 / 208,7 |
| Alumno al límite | 10.000 | 1.299.888 | 430,5 / 565,6 | 443,7 / 578,4 | 895,5 / 1.141,8 | 1.106,1 / 1.298,2 |

| RPC de preparación por HTTP | p50 / p95, 1 sesión (ms) | p50 / p95, 5 sesiones (ms) |
|---|---:|---:|
| Viajes de la semana | 29,4 / 37,7 | 51,7 / 64,3 |
| Viajes al límite | 196,6 / 260,2 | 386,1 / 448,8 |
| Detalle habitual | 15,9 / 21,8 | 32,0 / 37,9 |
| Detalle cerca del límite | 234,6 / 316,2 | 485,6 / 617,6 |
| Alumno habitual | 16,9 / 31,5 | 26,5 / 33,7 |
| Alumno al límite | 231,9 / 397,2 | 492,8 / 616,8 |

Las 300 solicitudes de referencia y las 1.200 posteriores terminaron sin errores inesperados. El mayor p95 de descarga completa fue **874,6 ms con una sesión** y **1.815,2 ms con cinco**, por debajo de 2 y 5 s. En la tanda mixta con cinco sesiones, el p95 de Asistencia fue de 108,1 ms TTFB y el de la descarga fue de 950,4 ms hasta recibir el archivo. El pico de memoria residente de Next.js pasó de 298,4 a 366,3 MiB durante la tanda de carga completa.

`EXPLAIN (ANALYZE, BUFFERS)` sobre la consulta interna midió 124,468 ms para el listado con 10.000 filas, 140,990 ms para un viaje con 9.990 eventos, 165,206 ms para el alumno con 10.000 eventos y 10,857 ms para el alumno con 500. El listado leyó los 10.000 viajes solicitados. Las consultas de eventos usaron `idx_bus_attendance_trip_scanned` e `idx_bus_attendance_student` para localizar los registros. Los índices existentes cubrieron los casos medidos.

## Hallazgos

| Severidad | Pasos | Esperado | Observado y evidencia | Estado |
|---|---|---|---|---|
| Media | Abrir Viajes con el parámetro `desde=0000-01-01` | Aviso de fecha inválida antes de consultar Supabase | El validador de Viajes aceptaba el año cero y Postgres lo rechaza | Se validó el año en el esquema y se agregó cobertura de parámetros de exportación en Vitest |
| Baja | Abrir un detalle de viaje y solicitar una descarga que exceda el tamaño máximo | El aviso indica el límite aplicable al viaje | El mensaje inicial pedía acotar la consulta. Playwright reprodujo el mensaje con un registro sintético que excedía el tamaño | Aviso específico para el detalle. La prueba falló en la versión anterior y pasó tras recompilar |
| Baja · pruebas | Ejecutar la comparación SQL entre el archivo y el listado paginado | La prueba compara la primera fila por las columnas operativas | El operador de resta de JSON se agrupaba con el índice de fila y PostgreSQL intentaba convertir `id` a entero | Se corrigió la agrupación y pasó la suite SQL |

## Validación y operación

Comandos del repositorio desde `web/` para lint, unidades, compilación y navegador.

```text
npm run lint
npm test
npm run build
npm run e2e
```

Para reproducir contra Supabase local, aplicar la 045 y ejecutar `supabase/tests/etapa9_exportacion.sql` con psql y `ON_ERROR_STOP=1` después de `etapa1_roles.sql`. Para medir las rutas, iniciar la compilación con `npm run start`, calentar cada escenario y medir con sesiones MFA sobre el mismo conjunto de datos. Los tiempos de descarga terminan al recibir todos los bytes.

Para las pruebas de esta sesión se alineó temporalmente la contraseña de la cuenta sintética de administrador y se usó su factor MFA local inscrito. Al terminar se restauró la contraseña original y se retiraron los alumnos, viajes y entradas de auditoría sintéticos de Exportación.

Orden de publicación en validación. Aplicar [045](../../../supabase/pending/045_admin_exports.sql), publicar la web y descargar desde cada origen con MFA. Para revertir, retirar la versión web y aplicar [045 rollback](../../../supabase/pending/045_rollback.sql).
