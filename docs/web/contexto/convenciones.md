# Convenciones de código — Sistema web BusControl

## Estilo
- Formato: Prettier (configuración del proyecto Next.js)
- Naming: camelCase para variables y funciones, PascalCase para componentes React, kebab-case para archivos
- Imports: absolutos con alias `@/`, orden: externos → internos → tipos

## Patrones que SÍ usamos
- Server Actions de Next.js para escrituras sensibles (validan en servidor antes de escribir en Supabase)
- Consultas directas a Supabase para lecturas simples
- Funciones de base de datos `SECURITY DEFINER` para escrituras, derivando el usuario de `auth.uid()`
- Tipado explícito de filas de `qr_codes` (no `implicit any`)
- `createClient()` async porque `cookies()` es async en Next.js 15/16
- `createClient()` dentro de `useEffect` + `useState` en páginas de login para evitar llamadas de cliente durante SSR

## Patrones PROHIBIDOS
- Nada de `any` en TypeScript (salvo llamadas RPC a funciones en schema `buscontrol`, donde se usa `(supabase as any).rpc(...)`)
- Nada de lógica de negocio en componentes (va en Server Actions o funciones de BD)
- Nada de `service_role` en Server Actions (rompería `auth.uid()`)
- Nada de `INSERT`/`UPDATE`/`DELETE` directo desde el cliente en tablas sensibles
- Nada de guardar PDF/PNG en Supabase Storage (descarga directa al navegador)

## Tests
- Dónde van (planeado, aún no instalado ni creado): `web/__tests__/` (Jest para unitarias, Playwright para E2E)
- Qué se testea sí o sí: emisión de carnet, reimpresión, reporte de pérdida, funciones de BD rechazan roles no administrador, alta/baja lógica de beneficiario, protección de rutas

## Commits
- Formato: Conventional Commits (ej: `feat:`, `fix:`, `docs:`)
