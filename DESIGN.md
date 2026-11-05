# Diseno de CerroBus

Decisiones aprobadas por el dueno del proyecto el 2026-11-04.
Prototipo de referencia (privado): https://claude.ai/artifact/EGWDydVfJW7BzwqK9mxgEn

Estado: implementado en la rama `feat/rediseno-cerrobus`. Falta probarlo en un celular real y con la base real.

## Tipo de diseno

- Institucional y cercano: mar de Cerro Azul, azules y escudo real.
- Olas en la cabecera de las pantallas y olas animadas en el ingreso. No se usan en la camara del escaner.
- Poca letra: cada pantalla muestra lo justo, sin textos explicativos ni tablas.
- Navegacion del personal: Viaje, Escanear, Lista, Perfil. Apoderado: Inicio, Mapa, Historial, Perfil.

## Decisiones cerradas

| Tema | Decision |
|---|---|
| Nombre visible | CerroBus (reemplaza "Bus Escolar") |
| Lectura de QR | Muestra el nombre del alumno y se acepta para registrar |
| Letra | Nunito Sans |
| Botones principales | Marino `#12395F`, texto blanco |
| Amarillo | Eliminado de la interfaz (solo sigue dentro del escudo) |
| Tamano de letra | Normal en el prototipo: base 16 px; textos secundarios desde 13 px |
| Filtros de Lista | Iguales a la app: contadores que filtran y botones Todos, Pendientes, En colegio |

## Colores

| Uso | Valor |
|---|---|
| Boton principal | `#12395F` |
| Cabecera | `#0A4F8A` |
| Mar del ingreso | `#083E6E` |
| Cielo del ingreso | `#E8F6FE` |
| Olas | `#A9DCF6`, `#9AD4F5`, `#4CAEE6`, `#3F9EE0` |
| Texto | `#0D2C47`; secundario `#4A6478` |
| Lineas | `#E1EBF1` |
| Pendiente | `#B4480F` sobre `#FCEDE3` |
| En bus / a bordo (etiquetas) | `#0B5FB0` sobre `#E1F0FB`; circulo de iniciales `#12395F` |
| En colegio / en casa | `#157045` sobre `#E2F4EA` |
| Accion destructiva | `#B3261E` |

Accion "Marcar en colegio/casa": verde `#157045`, como en la app actual.

## Ingreso

Escudo grande sobre cielo claro, nombre, olas y formulario sobre el mar: campos translucidos y boton "Ingresar" blanco.

## Lista

Respeta `RosterScreen.tsx`, `RosterStudentRow.tsx` y `roster-filter.utils.ts`:

- Contadores que filtran y botones de filtro. Recojo: Pendientes, En bus, En colegio. Retorno: Faltan, A bordo, En casa.
- Lupa: busca por nombre o codigo.
- "Dejar todos en colegio/casa (n)" para chofer y asistenta (permiso `canBulkDropoff`), con alumnos a bordo.
- Encabezado de lista con filtro y "N mostrados".
- Fila: iniciales, nombre, parada y hora; a la derecha la accion o el estado.
- Turno de tarde: aviso "Vino en la manana", su vista propia y "Marcar ausente".
- El estado se ve en el color del circulo de iniciales. Sustituye la franja lateral de la fila actual.

## Movimiento

- Pulsar: `scale(.97)` en 160 ms, `cubic-bezier(.23,1,.32,1)`.
- Olas en movimiento solo en el ingreso. Se apagan con movimiento reducido.

## Reglas

- Escudo real: `mobile/assets/images/escudo_MDCA.png`. No redibujarlo.
- No quitar funciones ni inventar acciones: revisar primero la pantalla actual en el codigo.
- Objetivos tactiles de 44 px como minimo. Contraste AA.
- Rechazado: infantil, bancario, Estado viejo, adornos excesivos, amarillo en botones, exceso de texto.

## Falta en el prototipo y debe conservarse al implementar

- Avisos de sin senal y "Pendiente sync".
- Confirmacion antes de marcar una bajada.
- Deshacer y Anular segun permiso y estado de subida.
- Mapa e historial completos del apoderado.
- Modo oscuro y alto contraste.

## Permisos

- La asistenta controla la lista de llegada, asi que puede usar "Dejar todos" (`canBulkDropoff`). Sigue sin poder iniciar ni cerrar viajes.

## Implementacion

- Olas: siluetas incrustadas como data URI (`src/shared/ui/waveImages.ts`, generadas por `scripts/generate-wave-assets.mjs`), pintadas con `tintColor` en `WaveBand`. Evitan agregar `react-native-svg`, que obliga a recompilar el dev client.
- Cabecera unica: `WaveHeader`. Cada pantalla la pinta; las pestanas usan `headerShown: false`.
- Historial del apoderado: pestana propia con los ultimos 7 dias.
