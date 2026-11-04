# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

Build Expo instalada en Android, mas una PWA web con la misma interfaz. Inferido del repositorio; iOS no esta confirmado.

## Users

- Choferes y asistentas del bus escolar municipal: registran con QR o a mano quien sube y baja, en ruta, varias veces al dia.
- Apoderados: consultan si su hijo subio o bajo, ven el historial del dia y la ubicacion del bus.

El usuario pidio que el diseno luzca en todos los roles por igual, sin una pantalla que mande sobre las demas.

## Product Purpose

CerroBus es el control de asistencia del bus escolar de la Municipalidad de Cerro Azul. Exito: que el chofer registre sin errores aunque no haya senal, y que cada familia sepa donde esta su hijo sin tener que llamar.

## Positioning

Es el servicio de la propia municipalidad para los ninos del distrito de Cerro Azul, no un producto comercial de rastreo.

## Operating Context

- Turnos: recojo de manana, tarde y retorno. Un viaje se inicia, se escanea, se registra la bajada y se cierra.
- Se usa dentro del bus, a veces con sol directo y a veces sin senal. La cola offline sube los registros cuando vuelve la red.
- Piloto de un solo bus (BUS-01).

## Capabilities and Constraints

- Funcion existente que no cambia: escaner QR, registro manual, padron, cierre de viaje, historial de 7 dias, mapa del bus, notificaciones (solo app Android instalada), modo de alto contraste, tema claro y oscuro.
- Expo 54, React Native y react-native-paper. Los colores salen de `mobile/src/core/theme/semanticColors.ts` y `tokens.ts`.
- Nombre visible de la app y de la PWA: CerroBus.

## Brand Commitments

- Escudo real de Cerro Azul: `mobile/assets/images/escudo_MDCA.png`. No redibujarlo ni sustituirlo.
- Debe verse profesional e institucional. Rechazado por el usuario: infantil, bancario, Estado viejo, adornos excesivos.

## Evidence on Hand

- Datos de prueba: Ana Rios, Jose Nanez Perez, Luis Quispe, Maria Lopez, Colegio Prueba, Calle Falsa 123. Son ficticios.
- No hay testimonios, cifras de uso ni fotos propias del bus en el repositorio.

## Product Principles

1. Registrar nunca debe depender de la senal ni dejar dudas de si quedo guardado.
2. Cada pantalla responde primero lo que esa persona vino a saber.
3. Un dato de ninos se muestra solo a quien le corresponde.
4. Es un servicio publico: serio y cercano a la vez.

## Accessibility & Inclusion

Lectura con sol directo (ya existe modo de alto contraste). Objetivos tactiles de 48 px. Contraste AA como minimo, verificado por prueba en `semanticColors.contrast.test.ts`.
