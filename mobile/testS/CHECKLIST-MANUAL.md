# Checklist manual — piloto CerroBus

Marca cada ítem después de probar en dispositivo real. Jest no cubre red, Supabase ni push.

## Antes de empezar

- [ ] Migraciones **021** y **022** ejecutadas en Supabase SQL Editor
- [ ] Si reiniciaste datos: `supabase/scripts/reset-operational-data.sql`
- [ ] Metro con dev client: `npm run start` en `mobile/`
- [ ] Chofer y padre con cuentas de prueba

---

## Chofer — recojo mañana

| Paso | Acción | Esperado | OK |
|------|--------|----------|-----|
| 1 | Iniciar viaje recojo mañana | Viaje `active` | ☐ |
| 2 | Escanear alumno (subió) | Lista: a bordo | ☐ |
| 3 | Marcar en colegio / bajar | En colegio, **sin** "Pendiente sync" pegado | ☐ |
| 4 | Anular registro | Vuelve a a bordo | ☐ |
| 5 | Marcar en colegio otra vez | Queda en colegio (migración 022) | ☐ |
| 6 | Cerrar viaje | Status `completed` en Supabase | ☐ |

---

## Chofer — retorno tarde

| Paso | Acción | Esperado | OK |
|------|--------|----------|-----|
| 1 | Iniciar retorno tarde | Viaje activo | ☐ |
| 2 | Escanear subió | En bus / retorno | ☐ |
| 3 | Marcar llegó a casa | Completado | ☐ |

---

## Padre (APK o dev client)

| Paso | Acción | Esperado | OK |
|------|--------|----------|-----|
| 1 | Abrir Inicio | Estado del hijo hoy | ☐ |
| 2 | Tras escaneo chofer | Actualiza en ~20 s o al volver a Inicio | ☐ |
| 3 | Tarde con retorno activo | No muestra "camino al colegio" de mañana | ☐ |
| 4 | Detalle del hijo | Historial del día | ☐ |
| 5 | Mapa (Android con WebView) | Mapa OSM o fallback con botón | ☐ |

---

## Supabase (SQL Editor)

```sql
-- Últimos escaneos de hoy
SELECT s.nombre_alumno, t.direction, t.turn_type, r.event_type, r.scanned_at, r.voided_at
FROM buscontrol.bus_attendance_records r
JOIN public.social_bus_escolar s ON s.id = r.student_id
JOIN buscontrol.bus_trips t ON t.id = r.trip_id
WHERE t.trip_date = CURRENT_DATE
ORDER BY r.scanned_at DESC
LIMIT 20;
```

- [ ] Los escaneos del piloto aparecen aquí
- [ ] `voided_at` solo en registros anulados

---

## Push (opcional)

- [ ] FCM configurado en Expo + APK reciente
- [ ] Padre con token en `device_push_tokens`
- [ ] Tras escaneo, notificación o fila en `notification_log`

---

## Automatizado

```bash
cd mobile
npm run test:all
```

Abre `testS/LAST-RUN.md` para ver qué falló en lint/tests.
