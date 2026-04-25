# 🚌 BusControl QR

<p align="center">
  <strong>Sistema de asistencia escolar para transporte municipal mediante códigos QR</strong><br />
  Registro simple, rápido y en tiempo real desde una app móvil.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Estado-MVP%20en%20desarrollo-orange" alt="Estado MVP" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase PostgreSQL" />
</p>

---

> [!IMPORTANT]
> Este proyecto está en fase **MVP** y prioriza validación rápida en campo para choferes/asistentes.

## 📌 Descripción

Los estudiantes tienen un carnet con código QR.  
El operador escanea el código desde la app y el sistema registra automáticamente la asistencia.

### ¿Qué permite?

- Registrar **subida** al bus
- Registrar **bajada** del bus
- Registrar eventos manuales en caso de falla del QR

> [!NOTE]
> Funcionalidades como ausencias, recogida por padre y notificaciones
> están planificadas para futuras versiones (v2+).

## 🚀 Flujo de uso

1. Login del operador
2. Inicio de viaje (**ida** o **vuelta**)
3. Escaneo del QR del alumno
4. Identificación automática del alumno
5. Registro del evento (subida/bajada/manual)
6. Visualización de asistencia en tiempo real
7. Cierre del viaje

## ⚙️ Stack tecnológico

| Componente             | Tecnología            |
| ---------------------- | --------------------- |
| App móvil              | Expo (React Native)   |
| Escaneo QR             | expo-camera           |
| Cliente de datos       | @supabase/supabase-js |
| UI                     | React Native Paper    |
| Pruebas en dispositivo | Expo Go               |

## 📱 Pantallas V1 (5 en total)

```text
Login -> Iniciar viaje -> Escanear QR -> Lista del viaje -> Cerrar viaje
```

## 🧩 Arquitectura (alto nivel)

```text
App móvil (operador) -> Supabase (API + Auth) -> PostgreSQL
                           ^
                           |
                   QR como identificador único
```

> [!NOTE]
> No se usa backend personalizado: la lógica de datos se apoya en Supabase.

## 🗃️ Modelo de datos V1 (mínimo cambio)

> [!IMPORTANT]
> En **V1** no se modifica la tabla `social_bus_escolar`.  
> Solo se agregan **2 tablas nuevas**: `trips` y `attendance_records`.

### Tabla existente: `social_bus_escolar` (sin cambios en V1)

| Campo         | Descripción                 |
| ------------- | --------------------------- |
| id            | Identificador del alumno    |
| nombre_alumno | Nombre completo             |
| codigo        | Contenido del QR del carnet |

### Tabla nueva: `trips`

| Campo      | Descripción             |
| ---------- | ----------------------- |
| id         | Identificador del viaje |
| direction  | `ida` / `vuelta`        |
| status     | `active` / `completed`  |
| started_at | Inicio del viaje        |
| ended_at   | Fin del viaje           |

### Tabla nueva: `attendance_records`

| Campo      | Descripción                          |
| ---------- | ------------------------------------ |
| id         | Identificador del registro           |
| trip_id    | Relación con `trips`                 |
| student_id | Relación con `social_bus_escolar.id` |
| event_type | `boarded` / `alighted` / `manual`    |
| scanned_at | Fecha-hora del evento                |

## ✨ Características MVP

- ✅ Login con Supabase Auth
- ✅ Escaneo QR del carnet
- ✅ Mostrar nombre del alumno al escanear
- ✅ Guardar registro en Supabase
- ✅ Iniciar y cerrar viaje (`ida` / `vuelta`)
- ✅ Lista de alumnos por estado (verde/rojo)
- ✅ Marcado manual si el QR falla
- ✅ Alerta si alguien subió y no bajó

## 🛠️ Instalación y uso

### Requisitos

- Node.js + npm
- Expo Go (en celular)

### Pasos

```bash
git clone https://github.com/tuusuario/buscontrol
cd buscontrol
cd mobile
npm install
npx expo start --tunnel
```

Luego, en el celular:

1. Abrir **Expo Go**
2. Escanear el QR que aparece en consola

## 🗺️ Roadmap por versiones

### V1 — MVP (1 día de desarrollo)

**Lo que se construye hoy**

- Base de datos con **solo 2 tablas nuevas**: `trips` y `attendance_records`
- `social_bus_escolar` **no se toca**
- Flujo móvil de 5 pantallas para operar viaje y asistencia

**No entra en V1**

- Notificaciones
- Múltiples buses
- Modo offline
- Panel web
- Foto del alumno
- Historial avanzado

### V2 — Consolidación en campo (~1-2 semanas después)

- Foto del alumno al escanear (Supabase Storage)
- Notificación por WhatsApp (Twilio o WhatsApp API)
- Recogida por padre/tutor (`event_type: parent_pickup`)
- Historial por alumno (últimos 7 días)
- BD: agregar `photo_url` y `bus_id` a `social_bus_escolar`

### V3 — Escalamiento operativo (~1 mes después)

- Tablas `buses` y `bus_operators`
- RLS en Supabase por operador/bus
- Modo offline + sincronización automática
- Panel web de coordinación (Next.js)
- Renovación de QR (invalidar código viejo y generar nuevo)

### V4 — Sistema completo (futuro)

- App para padres
- GPS del bus durante escaneos
- Alertas automáticas nocturnas
- Calendarios y excepciones (feriados, suspensiones, cambios de ruta)

## 🎯 Enfoque del proyecto

> **"Primero que funcione, luego que escale."**

Se busca validar uso real rápidamente, evitando sobreingeniería en la etapa inicial.

## 📌 Estado actual

| Componente    | Estado               |
| ------------- | -------------------- |
| MVP general   | 🚧 En desarrollo     |
| Base de datos | ✅ Lista             |
| App móvil     | 🔄 En implementación |

## 👨‍💻 Autor

Proyecto desarrollado como solución práctica para control de asistencia en transporte escolar municipal.
