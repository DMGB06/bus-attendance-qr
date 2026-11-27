# Asistencia por alumno · validación local

**27 de noviembre de 2026.** Windows, Supabase local (PostgreSQL 17.6), Edge y Next.js. Los datos de prueba son sintéticos.

## Validación funcional

- La ficha abre en **Datos del alumno**. **Asistencia** abre por enlace directo, conserva el alumno y muestra los siete días de Lima, incluido hoy. Permite consultar también a un beneficiario dado de baja.
- Los filtros de fecha y turno determinan el resumen y la lista. El filtro de evento modifica la lista. QR y manual del mismo viaje cuentan una sola subida. El historial incluye los eventos anulados y su motivo cuando existe. Los dos contadores excluyen esos eventos.
- Se verificaron fechas inclusivas por día del viaje, registros después de la medianoche, desempate por ID, horas nulas al final, 20 filas por página y recuperación desde una página fuera de rango.
- Las 14 suites SQL y las 31 pruebas de Vitest pasaron. La RPC rechazó al administrador sin MFA o inactivo, a los roles móviles y al usuario anónimo. La compilación de producción y ESLint pasaron.
- Se ejecutaron las 50 pruebas de regresión de Playwright en Edge contra la compilación de producción. Pasaron 48 en la primera ejecución y las dos comprobaciones de avisos pasaron al repetirlas con los selectores corregidos.
- Se aplicaron, revirtieron y reaplicaron la RPC y el índice en Supabase local. Durante la prueba de indisponibilidad de la RPC, la ficha conservó la pestaña y mostró cómo reintentar. La suite de Asistencia pasó de nuevo tras reaplicar las migraciones.

## Revisión visual

Se comparó la ficha en Edge con Alumnos para la cabecera y la navegación, Auditoría para los filtros, y el detalle de Viajes para la tabla, el resumen y los estados. Se revisaron escritorio a 1.280 px, reflujo a 640 px equivalente al 200 % sobre 1.280 px y móvil a 360 y 320 px. El nombre de 144 caracteres y el motivo de 204 se ajustaron al ancho disponible.

Se probó el salto al contenido, la navegación por teclado, el foco visible y la posición del filtro enfocado respecto de la barra móvil. [Escritorio a 1.280 px](evidencia-asistencia/escritorio-1280.png) · [Móvil a 320 px](evidencia-asistencia/movil-320.png)

## Rendimiento

La ficha y el detalle de Viajes se midieron antes y después con compilaciones de producción y el mismo conjunto de **10.000 viajes y 100.000 eventos**. La pestaña se midió con un alumno que tenía **500 eventos en los últimos siete días**. El viaje usado como control de detalle también tenía **500 eventos**. Cada celda resume 30 solicitudes después del calentamiento. Las cinco sesiones usaron tokens MFA independientes y enviaron cinco solicitudes en paralelo por tanda. Se comprobó el contenido de cada respuesta.

| Página | Antes, 1 sesión p50 / p95 | Después, 1 sesión p50 / p95 | Antes, 5 sesiones p50 / p95 | Después, 5 sesiones p50 / p95 |
|---|---:|---:|---:|---:|
| Datos del alumno | 26,4 / 35,0 ms | 27,2 / 35,9 ms | 81,1 / 110,9 ms | 95,1 / 176,5 ms |
| Detalle de viaje | 21,6 / 25,8 ms | 35,3 / 45,0 ms | 71,2 / 95,8 ms | 80,9 / 103,9 ms |
| Asistencia, últimos siete días | — | 28,1 / 36,9 ms | — | 101,8 / 115,0 ms |
| Asistencia, fechas, turno y subidas | — | 28,7 / 33,1 ms | — | 88,9 / 100,0 ms |
| Asistencia, página 20 | — | 26,6 / 44,6 ms | — | 83,6 / 92,5 ms |

Se midió TTFB para las páginas. La ficha y el detalle quedaron dentro de los presupuestos locales en ambas compilaciones. El p95 final subió frente a la línea base, con una diferencia máxima de 65,6 ms en la ficha con cinco sesiones. En la primera tanda posterior a la implementación, el p95 con cinco sesiones fue de 85,1 ms para la ficha y 83,8 ms para el detalle. Las tandas reflejan la variación del entorno local.

| RPC por HTTP | Antes del índice, 1 sesión p50 / p95 | Con índice, 1 sesión p50 / p95 | Antes del índice, 5 sesiones p50 / p95 | Con índice, 5 sesiones p50 / p95 |
|---|---:|---:|---:|---:|
| Primera página | 12,6 / 17,9 ms | 6,9 / 8,9 ms | 20,1 / 23,9 ms | 11,0 / 12,2 ms |
| Página 20 | 11,3 / 13,6 ms | 7,2 / 11,0 ms | 19,1 / 21,6 ms | 11,8 / 18,6 ms |

Las 420 solicitudes de la medición final, 300 de página y 120 de RPC, terminaron con cero errores. También finalizaron sin errores las 120 solicitudes de la línea base web y las 120 de la RPC sin índice. Los mayores p95 de Asistencia fueron 44,6 ms con una sesión, 115,0 ms con cinco y 18,6 ms para la RPC. Las metas locales eran 300, 600 y 100 ms, respectivamente.

`EXPLAIN (ANALYZE, BUFFERS)` sobre la consulta de la RPC mostró un recorrido secuencial que descartaba **99.500 filas** de otros alumnos. Con el índice, Postgres usó `Bitmap Index Scan` sobre `idx_bus_attendance_student` y seleccionó los 500 eventos del alumno. La primera página pasó de **11,860 a 2,986 ms** y de **1.714 a 213 accesos a búferes compartidos en el nodo raíz**. La página 20 pasó de **11,384 a 2,914 ms** y de **1.752 a 251**. El detalle de Viajes mantiene su índice por viaje.

## Hallazgos

| Severidad | Pasos | Esperado | Observado y evidencia | Estado |
|---|---|---|---|---|
| Media | Consultar Asistencia con el volumen de carga y ejecutar `EXPLAIN (ANALYZE, BUFFERS)` sin la 044 | Leer los eventos del alumno consultado mediante un acceso selectivo | El recorrido secuencial descartó 99.500 eventos. P95 de la RPC inicial con cinco sesiones de 23,9 ms | Corregido con la 044. P95 final de 12,2 ms |
| Media | Abrir Asistencia a 320 × 720 px, desplazarse hasta los filtros y tabular de Hasta a Turno | El control enfocado aparece íntegro por encima de la barra inferior | Turno recibió el foco con su borde superior a 671,9 px. La barra cubría el centro del control | Corregido con espacio de desplazamiento reservado para la barra. Se agregó una regresión de Playwright |
| Baja · pruebas | Consultar un rango de fechas invertido en la compilación de producción | Playwright verifica el aviso de validación | El selector también encontraba el anunciador de navegación de Next.js | Se acotaron las comprobaciones de Asistencia y Viajes a sus zonas de contenido |
| Baja · entorno local | Iniciar sesión con la cuenta de prueba usando `.env.test.local` | La cuenta y el factor configurados permiten completar MFA | Auth devolvió `invalid_credentials` y luego `mfa_verification_failed` con el secreto configurado | Verificación completada con la contraseña de prueba alineada temporalmente y el factor local ya inscrito |

Las comprobaciones SQL usaron una conexión directa a PostgreSQL local por el puerto 54322 porque el proceso carecía de acceso al canal de Docker. Playwright usó esa misma base para preparar las pruebas y completó el ingreso por la interfaz con MFA. Al cerrar se restauró la contraseña original de la cuenta de prueba y se retiraron los datos sintéticos nuevos.

## Publicación y reversión

1. Aplicar [043](../../../supabase/pending/043_admin_student_attendance.sql) y luego [044](../../../supabase/pending/044_admin_student_attendance_index.sql). Ejecutar la 044 fuera de una transacción y verificar que el índice quede válido. Si una ejecución interrumpida deja un índice inválido, ejecutar su rollback y repetir la 044.
2. Publicar la web en el entorno de validación. Con un administrador con MFA, abrir la ficha de un alumno con historial, aplicar los filtros y abrir un viaje.
3. Para revertir, retirar primero la versión web que usa la RPC. Ejecutar [044 rollback](../../../supabase/pending/044_rollback.sql) fuera de una transacción y luego [043 rollback](../../../supabase/pending/043_rollback.sql).

La compilación de producción se validó en local. Las migraciones 043 y 044 quedaron aplicadas en esa instancia.
