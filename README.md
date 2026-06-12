# BusControl — Transporte escolar municipal

<p align="center">
  <strong>Control de asistencia, portal de apoderados, push y GPS para buses escolares</strong><br />
  Vocabulario operativo: <strong>recojo</strong> (casas → colegio) y <strong>retorno</strong> (colegio → casas).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stack-Expo%2054%20%7C%20Supabase-0ea5e9" alt="Stack" />
  <img src="https://img.shields.io/badge/Schema-buscontrol-8b5cf6" alt="Schema buscontrol" />
</p>

---

## Qué es

App móvil **Expo/React Native** con backend **Supabase** (`buscontrol` + padrón `public.social_bus_escolar`). Soporta varios roles en una sola app:

| Rol | Uso |
|-----|-----|
| **Chofer** | Inicia/cierra viaje, escanea QR, publica GPS |
| **Asistenta** | Escanea en segundo celular (mismo viaje) |
| **Padre** | Ve estado de hijos, mapa del bus, notificaciones push |
| **Coordinador** | Mismos permisos operativos que chofer (V1); altas vía Supabase Studio |

---

## Arquitectura mobile (`features/`)

```text
mobile/
  app/                          # Rutas Expo Router
    (auth)/login
    (ops)/(tabs)/               # Chofer / asistenta
      trip, scanner, roster, close-trip, profile
    (parent)/(tabs)/            # Apoderados
      home, map, profile
    (parent)/child/[id]
  src/
    core/                       # Supabase, rutas, tema
    features/
      auth/                     # Login, permissions
      profile/
      trips/                    # Viajes, roster, escaneo, offline
      parent/                   # Portal padres, mapa, timeline
      notifications/            # Push tokens y preferencias
```

Capas por feature: `domain/` (reglas puras) → `services/` → `hooks/` → `screens/` / `components/`.

---

## Modelo de datos (resumen)

| Tabla | Propósito |
|-------|-----------|
| `bus_trips` | Viaje activo; `direction`: `recojo` \| `retorno` |
| `bus_attendance_records` | Eventos: `subio`, `bajo`, `ausente`, `manual` |
| `app_profiles` | Rol app: `chofer`, `asistenta`, `padre`, `coordinador` |
| `bus_crew_assignments` | Operador ↔ bus por fecha |
| `bus_guardians` + `bus_student_guardians` | Apoderados (catálogo municipal) |
| `device_push_tokens` | Tokens Expo push |
| `bus_trip_locations` | Puntos GPS del viaje activo |

Migraciones: ver [`supabase/README.md`](supabase/README.md).

---

## Instalación local

### Requisitos

- Node.js 18+
- Expo Go o EAS Build para push/GPS en dispositivo real

### Variables

`mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Comandos

```bash
cd mobile
npm install
npm run start          # LAN
npm run start:tunnel   # túnel (Expo Go remoto)
npm test               # tests dominio (Jest)
```

---

## Build producción (EAS)

1. `npm install -g eas-cli` y `eas login`
2. En `mobile/app.json` → `extra.eas.projectId` (crear proyecto con `eas init`)
3. Configurar secretos en EAS: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Android APK municipal:

```bash
cd mobile
eas build --profile production --platform android
```

Perfiles en [`mobile/eas.json`](mobile/eas.json): `development`, `preview`, `production`.

---

## Documentación operativa

| Documento | Contenido |
|-----------|-----------|
| [`docs/PLAN-IMPLEMENTACION-MULTI-ROL.md`](docs/PLAN-IMPLEMENTACION-MULTI-ROL.md) | Plan por fases 0–6 |
| [`docs/MANUAL-OPERADORES.md`](docs/MANUAL-OPERADORES.md) | 2 celulares, offline, deshacer, anular |
| [`docs/MANUAL-COORDINACION.md`](docs/MANUAL-COORDINACION.md) | Altas padres/crew, verificación DNI |
| [`supabase/functions/send-attendance-push/README.md`](supabase/functions/send-attendance-push/README.md) | Webhook push |

---

## Tests unitarios (Fase 6.2)

```bash
cd mobile && npm test
```

Cubre reglas de:

- `permissions.test.ts` — capacidades por rol
- `student-status.mapper.test.ts` — etiquetas portal padres
- `attendance.rules.test.ts` — subida/bajada/ausente

---

## Smoke test rápido

**Operadores:** login chofer → iniciar recojo → escanear → lista → bajar en colegio → cerrar.

**Padres:** login padre → ver hijo en inicio → abrir mapa con viaje activo → recibir push al escanear.

**Coordinación:** alta en `bus_guardians` + `bus_student_guardians` → padre ve hijos.

---

## Estado del proyecto

| Fase | Tema | Estado repo |
|------|------|-------------|
| 0–2 | Multi-rol, offline, anular | Implementado |
| 3 | Portal padres | Implementado |
| 4 | Push | Implementado (+ deploy webhook) |
| 5 | GPS | Implementado (+ Maps API key Android) |
| 6 | Consolidación | En curso — tests, EAS, manuales, observabilidad |

**Criterio piloto Fase 6:** 1 bus real, 2 semanas, sin incidentes de datos; APK en distribución interna municipal.

---

## Principio

> Primero que funcione en campo con datos confiables; luego escalar sin romper reglas de negocio.
