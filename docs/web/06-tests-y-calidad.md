# Pruebas y calidad

## Pruebas unitarias
Se utilizan Jest con librerías de testing para componentes y lógica de negocio. Se prueban:
- Emisión de carnet: toma el código del padrón y deja un solo vigente por alumno
- Reimpresión (el anterior queda reemplazado) y reporte de pérdida
- Funciones de base de datos: rechazan a roles distintos de administrador y a alumnos sin código
- Alta y edición de apoderados y vínculos con alumnos
- Alta y baja lógica/desactivación de un alumno como beneficiario: no modifica `social_bus_escolar`
- Pruebas de las migraciones con un usuario de cada rol (administrador, chofer, asistenta, padre, coordinador, anónimo): emitir, reemitir, reportar, lectura y escritura directa denegada
- Concurrencia: dos emisiones simultáneas al mismo alumno dejan un solo carnet vigente
- Autenticación y protección de rutas

## Pruebas end-to-end
Se utilizan Playwright para flujos críticos:
- Login de administrador
- Acceso denegado a roles que no son administrador
- Generación y descarga de QR
- Reimpresión de carnet y reporte de pérdida
- Descarga de PDF de carnets

## Contratos de tipos
Se validan los tipos de TypeScript generados desde el schema de Supabase con el comando de verificación de tipos.

## Mocks
Se utilizan mocks de Supabase para aislar las pruebas unitarias de la base de datos real.
