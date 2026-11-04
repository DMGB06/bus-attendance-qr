# CerroBus (app móvil y PWA)

App de transporte escolar de la Municipalidad de Cerro Azul. Choferes y asistentas registran la asistencia con QR, también sin señal. Los apoderados ven el estado de sus hijos y la ubicación del bus.

Stack: Expo 54, React Native, TypeScript, expo-router y Supabase (schema `buscontrol` y padrón en `public.social_bus_escolar`).

## Requisitos

- Node 20.19.4 o superior
- Cuenta de Expo y EAS para builds nativos

## Instalación

```bash
npm install
cp .env.example .env
```

Completa `.env` con la URL y la clave anónima del proyecto Supabase. La clave `service_role` nunca debe llevar el prefijo `EXPO_PUBLIC_`.

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm start` | Servidor de desarrollo con dev client en la red local |
| `npm run start:tunnel` | Igual, por túnel |
| `npm run web` | Versión web |
| `npm run build` | Exporta la PWA a `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Pruebas con Jest |
| `npx tsc --noEmit` | Revisión de tipos |
| `npm run test:all` | Lint y pruebas, con reporte en `testS/LAST-RUN.md` |

## Builds

```bash
eas build --profile preview --platform android     # APK de prueba interna
eas build --profile production --platform android  # AAB para Play Store
```

## Estructura

- `app/`: rutas de expo-router. `(auth)` login, `(ops)` chofer y asistenta, `(parent)` apoderados.
- `src/features/`: código por dominio (`trips`, `parent`, `auth`, `notifications`, `profile`).
- `src/core/`: configuración, tema y conectividad.
- `src/shared/`: componentes y utilidades comunes.
- `testS/`: pruebas por rol y verificación de push.

## Modo sin conexión

Las asistencias sin señal se guardan en una cola local y se suben al volver la red. La cola no se borra al cerrar sesión: solo la sube la misma cuenta que registró los datos.
