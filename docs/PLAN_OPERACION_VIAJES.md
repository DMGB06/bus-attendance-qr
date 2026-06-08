# Plan operativo — Bus Escolar Cerro Azul

Documento de referencia: problemática real del chofer, gaps de la app actual y pasos para implementar la solución completa.

**Última actualización:** junio 2026  
**Estado:** Fase visual + Fase 3 (offline/optimista) implementadas. Flujo multi-tramo (mañana/tarde) **pendiente**.

---

## 1. Contexto operativo real

El bus municipal no hace un simple “ida y vuelta”. Un día típico tiene **varios tramos independientes**:

```
MAÑANA
  Recojo: casas/paradas → colegio(s)
  Al llegar: dejar a los niños en el colegio (no es “fin del día”)

TARDE (variable)
  Opción A — Dos recojos:
    ① Colegio primaria  → casas  → cerrar viaje
    ... ~2 horas ...
    ② Colegio secundaria → casas → cerrar viaje

  Opción B — Un solo recojo:
    Cuando secundaria no tiene clase: un viaje con todos los que suban
```

Colegios en el padrón (referencia, datos incompletos):
- **José Olaya Balandra** → en general primaria
- **Gerardo Salomón Mejía Saco** → en general secundaria

---

## 2. Problemas que reportó el operador / municipio

### 2.1 UI y lista de asistencia
| # | Problema | Impacto |
|---|----------|---------|
| P1 | Badges “Pendiente” desalineados, línea de estado suelta, filas desordenadas | Lista ilegible en campo |
| P2 | Botón **Manual** en cada fila de la Lista | Confuso; manual debe estar solo en **Escáner** |
| P3 | Solo filtros “Todos” y “Asistieron”; no se podía ver **pendientes** sin scroll | 100+ alumnos, imposible operar |
| P4 | Diseño genérico, header mal compuesto, modo oscuro débil | Poca confianza en herramienta municipal |

**Estado:** P1–P3 resueltos. P4 parcialmente resuelto (tema MDCA, header, Fase 2–3).

---

### 2.2 Estados y significado de “salida”
| # | Problema | Impacto |
|---|----------|---------|
| P5 | `bajo` se muestra como “Salida” / “Completado” como si fuera definitivo | En la mañana solo **dejaron en colegio**; a la tarde hay que recogerlos |
| P6 | No hay acción **masiva** al llegar al colegio por la mañana | Chofer no va a marcar 30 carnets uno por uno |
| P7 | Etiquetas no cambian según `recojo` vs `retorno` | Mismo texto para contextos distintos |

**Estado:** Pendiente de implementar.

---

### 2.3 Tarde: dos recojos y días variables
| # | Problema | Impacto |
|---|----------|---------|
| P8 | Modelo asume **un solo retorno** por día | No refleja primaria + secundaria separados |
| P9 | Algunos días **un solo viaje tarde** (secundaria sin clase) | Hace falta modo “tarde única / mixto” |
| P10 | No se puede confiar en `colegio` para separar primaria/secundaria | BD incompleta en muchos alumnos |

**Estado:** Pendiente. Requiere `turn_type` y UI al iniciar viaje.

---

### 2.4 Mañana ≠ obligatorio para la tarde
| # | Problema | Impacto |
|---|----------|---------|
| P11 | Beneficiario puede **no haber usado el bus en la mañana** (papá lo llevó) pero **sí en la tarde** | Lista “solo los de la mañana” lo excluiría mal |
| P12 | La mañana debe ser **pista**, no **filtro obligatorio** | Flexibilidad operativa |

**Estado:** Pendiente. Diseño acordado: padrón completo + badge “Vino en la mañana” + **prioritarios**.

---

### 2.5 No olvidar a nadie
| # | Problema | Impacto |
|---|----------|---------|
| P13 | Olvidar **subir** a un niño al salir del colegio (tarde) | Riesgo de seguridad |
| P14 | Olvidar **bajar** a un niño en su casa | Riesgo de seguridad |
| P15 | Tratar todos los no escaneados como “olvidados” es incorrecto | Muchos simplemente no usan el bus ese día |

**Estado:** Pendiente. Solución: **prioritarios** (vinieron AM, no escanearon PM) vs opcionales.

---

### 2.6 Escaneo y registro
| # | Problema | Impacto |
|---|----------|---------|
| P16 | En la tarde también debe **escanearse** al subir al bus | Consistencia y trazabilidad |
| P17 | Registro duplicado puede colapsar la BD (`UNIQUE trip+alumno+evento`) | Debe bloquearse en UI antes de insertar |
| P18 | Zonas sin señal en ruta | Lista y escaneo no pueden depender 100% de red |

**Estado:** P17–P18 resueltos (Fase 3). P16 ya funciona (`subio` en escáner); falta pulir flujo tarde.

---

## 3. Qué ya está implementado

| Área | Entregable |
|------|------------|
| Lista | 3 filtros + stats tappables; filas con layout fijo; sin Manual en fila |
| Escáner | QR + pestaña Manual; registro `subio` |
| Tema | Paleta escudo MDCA, header municipal, tipografía campo |
| Fase 3 | Caché roster, UI optimista, cola offline, alto contraste, carnets alineados |
| Viajes | `recojo` / `retorno`; un recojo completado antes de retorno; un viaje activo a la vez |

---

## 4. Modelo de solución (objetivo final)

### 4.1 Base de datos — sin cambios obligatorios

Tablas actuales alcanzan si se interpreta por **viaje activo**:

| Tabla | Uso |
|-------|-----|
| `bus_trips` | Un registro **por tramo** (mañana, tarde primaria, tarde secundaria, tarde única) |
| `bus_attendance_records` | `subio` / `bajo` / `manual` / `ausente` **por viaje** |

**Significado de eventos según dirección del viaje:**

| Viaje | `subio` | `bajo` |
|-------|---------|--------|
| `recojo` (mañana) | Subió en casa/parada | **Dejado en colegio** |
| `retorno` (tarde) | Subió en colegio | **Dejado en casa** |

**Restricción existente (mantener):**  
`UNIQUE (trip_id, student_id, event_type)` → un solo boarding y un solo dropoff por tramo.

### 4.2 Campo recomendado en `bus_trips`

Usar o formalizar `turn_type`:

| `turn_type` | `direction` | Descripción |
|-------------|-------------|-------------|
| `mañana` | `recojo` | Ida matutina |
| `tarde_primaria` | `retorno` | 1.ª vuelta tarde |
| `tarde_secundaria` | `retorno` | 2.ª vuelta tarde |
| `tarde_unica` | `retorno` | Un solo viaje tarde |

**Reglas de negocio:**
- Varios `retorno` el mismo día: permitido si el anterior está **cerrado**.
- Iniciar cualquier `retorno`: requiere `recojo` de **mañana completado** ese día.
- (Opcional) `tarde_secundaria` solo si `tarde_primaria` ya cerró — confirmar con operación.

### 4.3 Padrón de alumnos (mejora de datos, paralela)

| Campo | Para qué |
|-------|----------|
| `colegio` completo | Filtros sugeridos, reportes |
| `nivel` (`primaria` \| `secundaria`) | Automatizar listas cuando el dato exista |

**Mientras el dato falte:** el chofer usa búsqueda + escaneo; el modo de viaje es **etiqueta operativa**, no filtro duro.

### 4.4 Dos capas de información (tarde)

```
CAPA 1 — ¿Quién PUEDE usar el bus?     → Padrón activo
CAPA 2 — ¿Quién SUBIÓ en ESTE viaje?  → Escaneo (verdad)
CAPA 3 — ¿Quién es PRIORITARIO?        → Vino en la mañana y aún no escaneó en este viaje tarde
```

---

## 5. Flujos de pantalla (objetivo)

### 5.1 Mañana — Recojo

1. Iniciar viaje → **Recojo mañana**
2. **Escáner / Manual** → `subio` por cada alumno
3. Lista → filtro **En bus**
4. Llegada al colegio → botón **“Dejar todos en colegio (N)”** + confirmación
5. Alternativa: **“En colegio”** fila por fila
6. Cerrar viaje → advertir si **En bus > 0**

### 5.2 Tarde — Retorno (primaria / secundaria / única)

1. Iniciar viaje → elegir **Tarde primaria** | **Tarde secundaria** | **Tarde única**
2. Lista = **todos los beneficiarios activos** con badges:
   - Vino en la mañana
   - Sin registro mañana
   - A bordo / Ausente
3. En el colegio: **escanear** cada uno que sube (`subio`)
4. Antes de salir: revisar **Prioritarios sin subir** (vinieron AM, no PM)
5. Opción **Ausente** para los que no vendrán en este tramo
6. En casas: filtro **En bus** → **“En casa”** por alumno (no bulk)
7. Cerrar viaje → bloquear/aviso fuerte si **En bus > 0**

### 5.3 Mapa de botones

| Acción | Pantalla |
|--------|----------|
| Subir al bus (AM y PM) | **Escáner** (+ Manual) |
| Dejar todos en colegio | **Lista** (recojo, filtro En bus) |
| Dejar en casa | **Lista** (retorno, fila En bus) |
| Ver pendientes / prioritarios | **Lista** (filtros + banner contadores) |
| Iniciar / cerrar tramo | **Viaje** |

---

## 6. Plan de implementación paso a paso

### Fase A — Etiquetas y lenguaje (1–2 días)
**Resuelve:** P5, P7

- [ ] **A.1** Función `getDropoffLabel(trip.direction)` → “En colegio” / “En casa”
- [ ] **A.2** Renombrar acción de fila: “Salida” → etiqueta según viaje
- [ ] **A.3** Estados en badge: Pendiente / A bordo / En colegio / En casa
- [ ] **A.4** Mensajes al cerrar viaje según `recojo` vs `retorno`
- [ ] **A.5** Cabecera de lista y stats con contexto del tramo

**Archivos clave:** `RosterStudentRow`, `rosterConfirmations`, `CloseTripScreen`, `TripHeader`

---

### Fase B — Bulk “Dejar todos en colegio” (1 día)
**Resuelve:** P6

- [ ] **B.1** Servicio `bulkRegisterDropoff(tripId, studentIds[])` con validación por alumno
- [ ] **B.2** Botón en `RosterScreen` cuando `direction === 'recojo'` y `onboardCount > 0`
- [ ] **B.3** Modal de confirmación: “¿Registrar N alumnos dejados en colegio?”
- [ ] **B.4** Integrar con `rosterStore` (optimista + cola offline)
- [ ] **B.5** (Opcional) Atajo en `TripScreen`: “¿Llegaste al colegio?”

**Archivos clave:** `attendance-registration.service`, `RosterScreen`, `useTripRoster`

---

### Fase C — Múltiples tramos tarde (`turn_type`) (2 días)
**Resuelve:** P8, P9, P10 (parcial)

- [ ] **C.1** Ampliar tipo `TurnType` en app y al insertar en `bus_trips`
- [ ] **C.2** UI al iniciar viaje:
  - Mañana: Recojo
  - Tarde: Primaria | Secundaria | Única
- [ ] **C.3** Ajustar `trips.service.ts`: permitir 2+ retornos/día si el previo está `completed`
- [ ] **C.4** (Opcional) Exigir primaria cerrada antes de secundaria
- [ ] **C.5** `TripHeader` y tabs muestran tramo activo (“Tarde primaria”, etc.)

**Archivos clave:** `trips.service`, `TripScreen`, `types/index.ts`, posible migración SQL si `turn_type` tiene CHECK en Postgres

---

### Fase D — Lista tarde flexible + prioritarios (2–3 días)
**Resuelve:** P11, P12, P13, P15

- [ ] **D.1** Servicio `getMorningAttendanceHints(tripDate)` — quién tuvo `subio`+`bajo` en recojo mañana
- [ ] **D.2** En retorno: badge **“Vino en la mañana”** / **“Sin registro mañana”**
- [ ] **D.3** Filtro **Prioritarios**: vino AM + pendiente de escaneo en viaje tarde actual
- [ ] **D.4** Banner contadores: `Subieron X · Faltan Y · Prioritarios Z`
- [ ] **D.5** Alerta antes de salir del colegio si `prioritarios > 0`
- [ ] **D.6** Acción **Ausente** en lista (evento `ausente` en viaje tarde)

**Archivos clave:** nuevo `trip-day-context.service`, `useTripRoster`, `RosterScreen`, `RosterStudentRow`

---

### Fase E — Cierre de viaje y anti-olvido en casas (1 día)
**Resuelve:** P14

- [ ] **E.1** Mejorar `getPendingDropoffStudents` con mensajes por dirección
- [ ] **E.2** `CloseTripScreen`: listar nombres a bordo + prioritarios no subidos (retorno)
- [ ] **E.3** Confirmación destructiva solo si el chofer insiste

**Archivos clave:** `useCloseTrip`, `attendance.service`, `rosterConfirmations`

---

### Fase F — Datos de padrón (paralelo, no bloquea app) (ongoing)
**Resuelve:** P10 a largo plazo

- [ ] **F.1** Completar `colegio` en `social_bus_escolar`
- [ ] **F.2** Agregar columna `nivel_educativo` (`primaria` | `secundaria` | null)
- [ ] **F.3** Script de inferencia por colegio/edad para carga inicial
- [ ] **F.4** Cuando `nivel` exista: filtro **sugerido** (no obligatorio) al iniciar tarde primaria/secundaria

---

### Fase G — Escáner tarde avanzado (opcional, fase 2) (1–2 días)
**Resuelve:** P16 (bajada en puerta)

- [ ] **G.1** En retorno con alumno ya a bordo: escanear QR → `bajo` (en casa)
- [ ] **G.2** Toggle o detección automática subida vs bajada según estado del alumno

---

## 7. Orden recomendado de ejecución

```
A (etiquetas)  →  B (bulk colegio)  →  C (turn_type / multi-retorno)
        →  D (prioritarios tarde)  →  E (cierre viaje)
        →  F (datos padrón, en paralelo)
        →  G (QR bajada, opcional)
```

**MVP operativo mínimo para el chofer:** **A + B + C + D** (≈ 5–7 días de desarrollo).

---

## 8. Criterios de aceptación (checklist final)

- [ ] Mañana: dejar 30 niños en colegio con **un botón** (+ confirmación)
- [ ] Tarde primaria y secundaria son **viajes separados** cerrables independientemente
- [ ] Tarde única disponible cuando corresponda
- [ ] Niño que no fue en la mañana puede escanearse en la tarde sin trucos
- [ ] Antes de salir del colegio (tarde): alerta de **prioritarios** por nombre
- [ ] Al cerrar retorno: no permite ignorar silenciosamente niños **a bordo**
- [ ] Nunca se inserta duplicado del mismo evento (UI + BD)
- [ ] Lista y escaneo funcionan con señal débil (ya cubierto Fase 3)
- [ ] Etiquetas dicen “En colegio” / “En casa”, no “Salida” genérica

---

## 9. Referencia rápida — problemas → fase

| Problema | Fase |
|----------|------|
| P1–P3 UI lista | ✅ Hecho |
| P4 diseño | ✅ Parcial |
| P5–P7 estados / etiquetas | A |
| P6 bulk colegio | B |
| P8–P10 multi-retorno | C |
| P11–P12 flexibilidad tarde | D |
| P13, P15 olvidar al subir | D |
| P14 olvidar al bajar | E |
| P16 escaneo tarde | ✅ / G opcional |
| P17 duplicados | ✅ Hecho |
| P18 offline | ✅ Hecho |
| P10 datos colegio/nivel | F |

---

## 10. Notas para el equipo

- **No renombrar** `subio`/`bajo` en Postgres por ahora; el significado lo da `trip.direction` + `turn_type`.
- Los carnets impresos deben regenerarse tras cambios de marca (`python scripts/generar_carnets_qr.py`).
- Validar con el chofer real el orden obligatorio primaria → secundaria antes de implementar C.4.
- Cualquier cambio en CHECK constraints de `turn_type` en Supabase debe documentarse en migración SQL.
