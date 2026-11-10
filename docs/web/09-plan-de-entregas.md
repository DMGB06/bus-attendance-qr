# Plan de entregas

## Nota sobre alcance total
El usuario pidió construir todo el sistema de una vez, sin fases tipo MVP. Este documento mantiene un orden de trabajo interno (para poder verificar cada parte a medida que se construye), pero no implica entregas parciales al usuario final ni pausas de validación obligatorias entre una y otra.

## Actualización 9/11/26
El alcance de Release 1 suma "Cuentas de padres" (crear la cuenta de un apoderado, reiniciar su contraseña, bloquear y reactivar el acceso) y no incluye envío de correo: no hay SMTP y las credenciales se entregan en persona. Detalle en `docs/superpowers/specs/2026-11-09-panel-admin-requisitos-design.md`.

## Orden de construcción recomendado

### Fase 1 — Base técnica
- Configurar proyecto Next.js en la carpeta web del repositorio
- Configurar conexión a Supabase (mismo proyecto que el móvil)
- Configurar autenticación de administrador
- Configurar middleware de protección de rutas

### Fase 2 — Gestión de códigos QR
- Emisión de carnet individual y por lotes usando el código del padrón (no se generan códigos nuevos)
- Consulta de estado del carnet (vigente, reemplazado, reportado perdido)
- Descarga de PNG individual
- Descarga de PDF con varios carnets por hoja
- Reimpresión (cierra el carnet vigente anterior y registra uno nuevo) y reporte de pérdida

### Fase 3 — Panel de control (dashboard)
- Resumen de buses activos
- Resumen de viajes del día
- Resumen de códigos QR generados
- Alertas básicas (alumnos sin apoderado, alumnos sin carnet vigente)

### Fase 4 — Gestión de alumnos y apoderados
- Búsqueda de alumnos en el padrón existente (solo lectura)
- Alta y baja lógica/desactivación de alumnos como beneficiarios del servicio, con estado activo (migración 028: tabla propia `bus_beneficiaries` con llave `student_id` y funciones de escritura; no modifica `social_bus_escolar`)
- Alta, edición y búsqueda de apoderados (requiere migración nueva con funciones de escritura)
- Vinculación y desvinculación de apoderados con alumnos

### Fase 5 — Gestión de buses y tripulación
- Alta de unidades de transporte
- Asignación de chofer y asistenta a un bus por fecha

### Fase 6 — Consultas operativas
- Vista de viajes activos y completados
- Vista de registros de asistencia con filtros

### Fase 7 — Auditoría
- Registro de acciones del administrador (qué generó, qué editó, cuándo)

## Por qué este orden
- El QR es el requerimiento más específico y urgente mencionado por el usuario
- La base técnica (autenticación y conexión) debe existir antes de cualquier módulo funcional
- Las gestiones de alumnos y apoderados dependen de tener ya el padrón accesible y el QR funcionando para dar contexto completo
- Las consultas operativas y la auditoría son de menor urgencia porque son de solo lectura o de respaldo

## Validación esperada al cerrar cada fase
- Fase 1: el proyecto Next.js corre localmente y el login funciona
- Fase 2: se puede generar, descargar e imprimir un carnet con QR legible por la app móvil
- Fase 3: el dashboard muestra datos reales desde Supabase
- Fase 4: se puede buscar un alumno, darlo de alta/baja lógica como beneficiario, dar de alta un apoderado y vincularlos
- Fase 5: se puede asignar un chofer a un bus para una fecha específica
- Fase 6: se puede consultar el historial de un viaje y su asistencia
- Fase 7: cada acción del administrador queda registrada con fecha y usuario
