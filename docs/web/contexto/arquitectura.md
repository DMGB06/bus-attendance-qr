# Arquitectura — Sistema web BusControl

## En una frase
Plataforma web administrativa complementaria a la app móvil BusControl, para gestión del transporte escolar municipal desde un solo rol de administrador, usando el mismo proyecto Supabase.

## Stack
- Lenguaje / runtime: TypeScript, Node.js
- Framework principal: Next.js 16.4.5 (App Router), Tailwind CSS
- Base de datos: Supabase (PostgreSQL, mismo proyecto que el móvil, schema `buscontrol`)
- Autenticación: Supabase Auth con `@supabase/ssr`
- Generación de QR y PDF: `qrcode` (PNG) + `pdf-lib` (PDF multi-carnet por hoja)
- Despliegue: Vercel (dominio por defecto `*.vercel.app`)
- Código: carpeta `web/` dentro del repositorio de BusControl

## Mapa de carpetas (planned)
- `web/app/` → páginas del App Router (login, dashboard, qr, alumnos, apoderados)
- `web/lib/supabase/` → cliente Supabase (servidor y cliente)
- `web/actions/` → Server Actions (emisión QR, reporte de pérdida, etc.)
- `web/components/` → componentes UI reutilizables

## Flujo de datos
Petición HTTP → Middleware de Next.js (`proxy.ts`, Next 16) verifica rol `administrador` → Server Action o consulta directa a Supabase → función `SECURITY DEFINER` con `auth.uid()` (nunca `service_role`) → respuesta al navegador (descarga de PNG/PDF local).

## Lo que NO existe (y no hay que crear)
- No hay backend separado.
- No hay capa de cache.
- No hay ORM (se usa el cliente de Supabase directamente).
- No hay Supabase Storage (los archivos se descargan al navegador).
- No hay escaneo QR en la web.
- No hay portal de apoderados en la web.
- No hay mapa GPS ni modo offline en la web.
