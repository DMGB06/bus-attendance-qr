# testS — suite de pruebas BusControl

Pruebas automatizadas agrupadas + checklist manual del piloto.

## Ejecutar todo (recomendado)

Los archivos `*.test.ts` usan globals de Jest (`describe`, `it`, `expect`). Si el editor marca error rojo pero `npm run test:all` pasa, recarga la ventana (`Ctrl+Shift+P` → "Developer: Reload Window") tras crear `jest.d.ts`.

```bash
cd mobile
npm run test:all
```

Genera **`testS/LAST-RUN.md`** con:
- ✅/❌ Lint
- ✅/❌ Tests (cuántos pasaron y **qué falló** con mensaje)

## Solo tests de esta carpeta

```bash
npm run test:suite
```

## Solo tests del código (`src/**/*.test.ts`)

```bash
npm test
```

## Estructura

| Archivo | Qué valida |
|---------|------------|
| `chofer.sync-and-roster.test.ts` | Pendiente sync, anular, volver a marcar en colegio |
| `padre.status.test.ts` | Estado padre mañana vs tarde, viajes duplicados |
| `auth.roles.test.ts` | Permisos chofer / asistenta / padre |
| `notification-templates.test.ts` | Event keys y textos de push |
| `CHECKLIST-MANUAL.md` | Pasos en teléfono + Supabase (no automatizable) |

## Verificación push en Supabase (en vivo)

```bash
cd mobile
npm run test:push
```

Agrega en `mobile/.env` (local, no commitear):

```env
SUPABASE_SERVICE_ROLE_KEY=...secret key del proyecto...
PUSH_VERIFY_GUARDIAN_ID=6403f4d2-3271-4ecd-a8cb-2e1979f4415f
PUSH_VERIFY_STUDENT_ID=0179cb41-80c5-410c-abcb-3b80b9c70d76
```

Genera **`testS/PUSH-VERIFY-LAST-RUN.md`** con ✅/❌ por: tablas, Edge Function, vínculo padre, token y `notification_log`.

## Lo que Jest **no** prueba

- Conexión real a Supabase
- Cámara / QR
- Push FCM
- GPS en ruta
- Rendimiento con 109 alumnos en red lenta

Usa `CHECKLIST-MANUAL.md` para eso.
