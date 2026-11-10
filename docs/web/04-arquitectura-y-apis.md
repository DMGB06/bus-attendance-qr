# Arquitectura y APIs

## Stack tecnológico
- Framework: Next.js con App Router
- Lenguaje: TypeScript
- Ubicación del código: carpeta `web` dentro del mismo repositorio de BusControl
- Estructura interna: patrón `features` adaptado con carpetas para administrador, QR, alumnos, apoderados, buses y viajes

## Backend
Se usa el mismo proyecto Supabase que la aplicación móvil. No se crea un backend separado.

## Tabla de beneficiarios (alumnos)
El estado de un alumno como beneficiario del servicio (activo/inactivo, alta y baja lógica) se registra en una tabla propia de `buscontrol` que referencia al alumno del padrón por su `student_id` (id del padrón). El `codigo` solo se muestra. El padrón municipal `social_bus_escolar` permanece de solo lectura y no se modifica. Se escribe con las funciones `SECURITY DEFINER` de la migración 028 (ver documento 10).

## Forma de consumo de datos
- Lecturas simples: consultas directas a Supabase desde el frontend o Server Actions
- Escrituras sensibles: Server Actions de Next.js que validan en servidor antes de escribir en Supabase

## Formato del código QR
El QR impreso contiene el `codigo` del padrón (ejemplo: BU0098), el mismo que ya escanea la app móvil. La web no genera códigos nuevos; las emisiones se registran en `buscontrol.qr_codes` mediante las funciones `issue_qr_card` y `report_qr_lost`, llamadas desde Server Actions.

## Archivos generados
- PNG individual por carnet
- PDF con varios carnets por hoja para impresión local
- Los archivos se descargan directamente al navegador del administrador y no se almacenan en Supabase Storage
