# Pruebas del sistema CerroBus

**27 de noviembre de 2026.** Se usaron Supabase local en Docker, Node 26.13.1, Microsoft Edge y cuentas sintéticas. El panel se probó con una compilación de producción. La app móvil se probó con Jest y con su exportación web de Expo a 390 × 844 px.

| Comprobación | Resultado |
|---|---|
| Panel web con `npm test`, lint y compilación | 57 pruebas aprobadas en 10 archivos. Lint y compilación aprobados |
| Regresión de navegador con Playwright en Edge | 62 de 62 casos aprobados sobre `next start`. Incluye MFA, gestión, exportaciones, rutas protegidas y Dashboard operativo |
| Supabase con `psql -v ON_ERROR_STOP=1` | 17 suites SQL aprobadas. Cubren roles, alumnos, apoderados, carnets, auditoría, Viajes, Asistencia, Exportación, Incidencias y Dashboard |
| App móvil con Jest, lint y `tsc --noEmit` | 334 pruebas aprobadas en 63 suites. Lint y TypeScript aprobados |
| Exportación web de Expo | Compilación aprobada con 47 rutas estáticas |
| Expo web conectado a Supabase local | Chofer y apoderado pudieron iniciar sesión, entrar a su módulo y conservar la sesión al recargar. La app rechazó credenciales inválidas y redirigió los accesos fuera del rol. La compilación corregida pasó los recorridos a 390 y 1.440 px |
| Generador de contraseñas de apoderados | 1 prueba aprobada con `node --test` |
| Integración HTTP de `guardian-account` | 17 de 17 casos aprobados. Incluye alta, ingreso, reinicio de clave, bloqueo, reactivación, permisos y auditoría |

## Hallazgo en la exportación web de Expo

**Severidad baja. Estado corregido.** La compilación anterior registraba el error de hidratación de React `#418` al abrir directamente `/home` sin sesión o como chofer. También se reprodujo al recargar `/home` como apoderado.

La exportación de diagnóstico identificó la diferencia en [`WaveBand`](../mobile/src/shared/ui/WaveBand.tsx). El HTML estático incluía una copia de la ola y el primer render a 390 px generaba dos. El componente ahora usa el mismo ancho de referencia en el HTML estático y durante la hidratación. Después toma el ancho real y responde a los cambios de tamaño.

En Edge, la compilación corregida completó el acceso directo, la recarga y las redirecciones de chofer y apoderado sin errores de hidratación a 390 y 1.440 px. Se comprobó que las olas se adaptan al pasar de 320 a 1.440 px y volver a 390 px. Pasaron las 334 pruebas de Jest, lint, TypeScript y la exportación web de Expo.

## Cobertura en dispositivos

Los recorridos de cámara y QR en Android, GPS en un bus y entrega de notificaciones push quedan pendientes de prueba en dispositivo. El repositorio documenta esos casos en el [checklist móvil](../mobile/testS/CHECKLIST-MANUAL.md).
