# Diseño y alcance — Sistema web BusControl

## Qué es
Plataforma web complementaria a la aplicación móvil BusControl. Sirve para gestión centralizada del transporte escolar municipal desde un rol de administrador, separado de los roles del móvil (chofer, asistenta, padre, coordinador).

## Alcance incluido
- Autenticación de administrador
- Dashboard con métricas operativas
- Gestión de carnets QR: emisión con el código del padrón, consulta de estado (vigente, reemplazado, reportado perdido), descarga de PNG, descarga de PDF para impresión local, reimpresión y reporte de pérdida
- Gestión de alumnos como beneficiarios del servicio: alta de beneficiario, baja lógica/desactivación cuando dejan de ser beneficiarios, estado activo y vinculación con apoderados. Consulta y búsqueda en el padrón municipal `social_bus_escolar` (solo lectura; NO se edita desde la web).
- Gestión de apoderados: alta, edición y vinculación con alumnos (tablas `bus_guardians` y `bus_student_guardians`)
- Cuentas de padres: el administrador crea la cuenta de un apoderado, reinicia su contraseña y bloquea o reactiva el acceso (Edge Function `guardian-account`), sin envío de correo
- Gestión de buses y tripulaciones: alta de unidades y asignación de chofer/asistenta por fecha
- Consultas operativas de viajes y asistencia (solo lectura)
- Log de auditoría de acciones del administrador web

Nota: el administrador web tiene escritura sobre apoderados, vínculos alumno-apoderado y el estado activo/baja lógica de los alumnos beneficiarios, además de los carnets QR. Las políticas vigentes dan solo lectura a operadores y la tripulación se edita solo por service_role. Cada módulo necesita su propia migración con funciones de base de datos (ver documento 07).

## Alcance excluido (fase inicial)
- Envío de correo electrónico: no hay SMTP; las credenciales de los padres se entregan en persona
- Escaneo QR desde la web (sigue siendo exclusivo de la app móvil)
- Portal de apoderados web (ya existe en la app móvil)
- Mapa GPS en tiempo real en la web
- Modo offline para la web
- Más de un administrador web
- Métricas avanzadas, gráficas o exportación a Excel
- Reemplazo del script Python de generación de carnets (coexiste como respaldo offline)
- Migración de funcionalidades del móvil a la web (son sistemas distintos y complementarios)

## Principios
- Un solo administrador web
- La app móvil no se toca ni se elimina
- El web es un complemento para gestión, no un sustituto del operativo de campo
- Todo consume el mismo proyecto Supabase que el móvil
