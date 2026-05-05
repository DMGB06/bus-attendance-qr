# BusControl QR

<p align="center">
  <strong>Sistema de control de asistencia escolar para transporte municipal usando QR</strong><br />
  Registro de subida, salida y marcado manual con reglas de viaje ida/vuelta.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Estado-V1%20funcional-22c55e" alt="Estado V1 funcional" />
  <img src="https://img.shields.io/badge/Stack-Expo%20%7C%20Supabase-0ea5e9" alt="Stack Expo y Supabase" />
  <img src="https://img.shields.io/badge/Arquitectura-Modular-8b5cf6" alt="Arquitectura modular" />
</p>

---

## 1. Vision del proyecto

BusControl busca resolver un problema operativo real: registrar asistencia de alumnos en rutas escolares de forma rapida, confiable y auditable.

El enfoque es incremental:

- Primero una **V1 funcional en campo** (MVP usable por chofer/asistente).
- Luego escalar capacidades en versiones sucesivas sin caer en sobreingenieria.

---

## 2. Que problema resuelve

En operacion diaria, los equipos necesitan:

- Saber quien subio al bus.
- Saber quien bajo del bus.
- Evitar registros duplicados o inconsistentes.
- Tener trazabilidad por viaje y operador.

BusControl cubre eso con reglas de negocio y persistencia en Supabase.

---

## 3. Alcance actual (V1)

### Flujo operativo principal

1. Login de operador.
2. Inicio de viaje (`ida` o `vuelta`).
3. Escaneo QR o busqueda manual por `codigo`.
4. Confirmacion y registro de asistencia.
5. Vista de lista del viaje con estado por alumno.
6. Registro de salida de alumnos.
7. Cierre de viaje con alerta si quedan alumnos sin salida.

### Pantallas V1

`Login -> Iniciar viaje -> Escanear QR -> Lista del viaje -> Cerrar viaje`

---

## 4. Arquitectura y organizacion del codigo

### Capas

1. **UI / Presentacion**  
   `mobile/app/**` y `mobile/src/components/**`
2. **Reglas de negocio (servicios)**  
   `mobile/src/services/**`
3. **Estado de sesion/viaje**  
   `mobile/src/stores/tripStore.ts`
4. **Acceso a datos**  
   `mobile/src/lib/supabase.ts` + Supabase/PostgreSQL

### Estructura principal

```text
mobile/
  app/
    (auth)/login.tsx
    (app)/(tabs)/scan.tsx
    (app)/(tabs)/scan-tab.tsx
    (app)/(tabs)/roster.tsx
    (app)/close-trip.tsx
  src/
    services/
      auth.ts
      students.ts
      trips.ts
      attendace.ts
      tripRoster.ts
    stores/tripStore.ts
    components/
    lib/supabase.ts
    types/index.ts
```

---

## 5. Modelo de datos real (actual)

> Nota: la implementacion usa `bus_trips` y `bus_attendance_records` (no `trips` / `attendance_records`).

### `social_bus_escolar` (existente)

Base de alumnos.

Campos clave usados:

- `id`
- `nombre_alumno`
- `codigo`
- datos complementarios (dni, colegio, apoderado, direccion)

### `bus_trips`

Representa un viaje operativo.

Campos clave:

- `id`
- `direction`: `ida | vuelta`
- `status`: `active | completed`
- `started_at`, `ended_at`
- `operator_id` (FK a `auth.users`)
- `trip_date`

### `bus_attendance_records`

Eventos de asistencia por alumno y viaje.

Campos clave:

- `id`
- `trip_id` (FK a `bus_trips`)
- `student_id` (FK a `social_bus_escolar`)
- `event_type`: `boarded | alighted | manual`
- `scanned_at`

Restriccion clave:

- `UNIQUE (trip_id, student_id, event_type)` para evitar duplicados del mismo evento.

---

## 6. Reglas de negocio implementadas

- No se inicia `vuelta` sin `ida` completada del mismo operador y mismo dia.
- Un operador no puede tener dos viajes `active` simultaneos.
- Si el QR/codigo no existe: mensaje **"Alumno no encontrado"**.
- Si hay duplicado por `23505`: mensaje **"Ya registrado"**.
- La salida (`alighted`) solo se permite si ya hubo `boarded` o `manual`.
- Al cerrar viaje, si hay alumnos sin salida, se exige confirmacion explicita.

---

## 7. Funcionalidades entregadas en V1

- Login con Supabase Auth.
- Inicio/cierre de viaje.
- Escaneo QR.
- Registro manual por codigo.
- Modal de confirmacion de alumno antes de registrar asistencia.
- Lista de asistencia con estados visuales.
- Marcado manual y registro de salida desde roster.
- Cierre seguro con alerta de pendientes.
- Ajustes responsive/safe-area para mejorar uso en distintos celulares.

---

## 8. Roadmap por versiones

### Vista ejecutiva

| Version | Objetivo                    | Resultado esperado                                                   |
| ------- | --------------------------- | -------------------------------------------------------------------- |
| **V1**  | Operacion base en campo     | Registrar asistencia y salida por viaje con reglas de integridad     |
| **V2**  | Consolidar operacion diaria | Mejor validacion visual, historial y gestion de casos no registrados |
| **V3**  | Escalar a multi-bus         | Soporte robusto por unidad, operador y conectividad limitada         |
| **V4**  | Plataforma integral         | Ecosistema completo para coordinacion y familias                     |

### V1 - MVP operativo (actual)

**Objetivo**  
Tener una app movil usable en campo con flujo completo de viaje y control basico de integridad.

**Incluye**

- Login.
- Inicio de viaje (`ida`/`vuelta`) con regla de negocio.
- Escaneo QR + registro manual.
- Lista del viaje con estado por alumno.
- Registro de salida (`alighted`).
- Cierre de viaje con validacion de pendientes.

**Datos**

- Uso de `bus_trips` + `bus_attendance_records`.
- Integridad referencial por FK.
- Control de duplicados por `UNIQUE`.

**Criterio de cierre**

- Flujo end-to-end operativo: login -> iniciar -> registrar -> listar -> cerrar.

### V2 - Consolidacion operativa

**Objetivo**  
Reducir friccion en campo y cubrir excepciones reales del dia a dia.

**Meta funcional**

- Foto de alumno en confirmacion/escaneo.
- Historial corto por alumno (ultimos dias).
- Evento de recogida por padre/tutor (ej. `parent_pickup`).
- Alta temporal para alumno sin QR.
- Panel web basico de coordinacion para revisar temporales.

**Meta tecnica**

- Endpoints/consultas optimizadas para historial.
- Politicas de acceso refinadas para operador/coordinador.

**Datos estimados**

- Ampliacion de `social_bus_escolar` (ej. `photo_url`, `bus_id`).
- Soporte para entidad temporal o estado `unregistered`.

**Criterio de cierre**

- El equipo puede operar sin bloquearse cuando hay alumnos sin carnet.

### V3 - Escalamiento multi-bus

**Objetivo**  
Soportar operacion simultanea de varias unidades y operadores con trazabilidad completa.

**Meta funcional**

- Gestion de buses y asignacion de operadores.
- Modo offline parcial con sincronizacion.
- Renovacion/invalidez de QR.
- Reportes de operacion por bus/ruta/periodo.

**Meta tecnica**

- Estrategia de sincronizacion y resolucion de conflictos.
- RLS por bus y rol de usuario.

**Datos estimados**

- Tablas `buses`, `bus_operators` y relaciones operativas.

**Criterio de cierre**

- Operacion estable en escenario de multiples rutas y conectividad variable.

### V4 - Plataforma integral

**Objetivo**  
Convertir BusControl en una plataforma completa de transporte escolar municipal.

**Meta funcional**

- App/portal para familias.
- Seguimiento GPS por eventos.
- Alertas automaticas.
- Calendarios y excepciones operativas.

**Meta tecnica**

- Automatizacion de notificaciones y monitoreo.
- Observabilidad operacional y reporteria avanzada.

**Criterio de cierre**

- Sistema integral con visibilidad completa para operadores, coordinacion y familias.

---

## 9. Instalacion y ejecucion

### Requisitos

- Node.js 18+
- npm
- Expo Go

### Configuracion

En `mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Ejecutar

```bash
cd mobile
npm install
npm run start
```

`npm run start` usa `expo start --tunnel`.

---

## 10. Validacion manual recomendada (smoke test)

1. Login valido.
2. Iniciar viaje `ida`.
3. Escanear QR valido.
4. Repetir QR (debe mostrar "Ya registrado").
5. Probar codigo inexistente (debe mostrar "Alumno no encontrado").
6. Registrar manual desde lista.
7. Registrar salida.
8. Cerrar viaje con y sin pendientes.
9. Iniciar `vuelta` solo tras `ida` completada.

---

## 11. Estado del proyecto

| Componente          | Estado          |
| ------------------- | --------------- |
| Flujo V1 de negocio | ✅ Operativo    |
| UI responsive base  | ✅ Aplicada     |
| Versiones V2+       | ⏳ Planificadas |

---

## 12. Principio de desarrollo

> **Primero que funcione en campo, luego que escale sin romper reglas de negocio.**

Esto evita codigo espagueti y prioriza:

- modularidad por servicios,
- separacion de responsabilidades,
- validaciones explicitas,
- y trazabilidad de eventos.
