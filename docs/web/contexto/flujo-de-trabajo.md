# Flujo de trabajo — Sistema web BusControl

## Antes de tocar nada
1. Leer `docs/web/contexto/decisiones.md` para no reabrir debates cerrados.
2. Leer `docs/web/11-validacion-seguridad-pre-migracion.md` para recordar los huecos de seguridad ya identificados.
3. Crear rama desde `main` con nombre descriptivo (ej: `feat/qr-emision`).

## Para hacer un cambio
1. Leer el documento de decisión correspondiente (01 a 12).
2. Escribir o revisar la migración SQL con rollback (una migración por módulo).
3. Escribir las pruebas primero (TDD: RED-GREEN-REFACTOR).
4. Implementar el código (Server Actions, componentes, páginas).
5. Pasar `tsc --noEmit` y `npm run lint`.
6. Pasar pruebas unitarias y E2E (cuando Jest y Playwright estén instalados).
7. Revisión de seguridad (`requesting-code-review` o `security-review`) antes del commit.

## Antes de dar algo por terminado
- [ ] `npm run build` pasa limpio
- [ ] `tsc --noEmit` sin errores
- [ ] `npm run lint` sin errores
- [ ] Tests unitarias verdes (planeado: Jest aún no está instalado en `web/`)
- [ ] Tests E2E verdes (planeado: Playwright aún no está instalado en `web/`)
- [ ] No quedan `console.log` ni `any` innecesarios
- [ ] Migración probada en Supabase de pruebas con usuario de cada rol, usando `supabase/tests/etapa1_roles.sql`, `etapa2_beneficiarios.sql` y `etapa2_apoderados.sql`
- [ ] Decisión documentada en `decisiones.md` si aplica

## Antes de crear un índice UNIQUE o una restricción nueva
- Correr la revisión de duplicados sobre los datos reales (producción, solo lectura) antes de escribir la migración. Usar `supabase/tests/check_duplicados_apoderados.sql` como base y agregar las columnas nuevas.
- Si devuelve filas, resolver los duplicados primero. No crear el índice a ciegas.

## Deploy
1. Respaldo de base de datos.
2. NUNCA usar `supabase db push` en producción (`supabase/migrations/` contiene el esquema base de pruebas). Ejecutar a mano en el SQL Editor, en orden, cada una en una ejecución aparte: 025 (sola, sin BEGIN/COMMIT: un valor de enum recién agregado no se puede usar en la misma transacción), luego 026, luego 027 (tras aviso a TI SIGEM), luego 028, luego 029, luego 030.
3. Crear usuario administrador manualmente en Supabase Auth y asignar `app_role = 'administrador'` con privilegios de servicio.
4. Desplegar Next.js en Vercel.
5. Verificar que el móvil siga funcionando sin interrupciones.
