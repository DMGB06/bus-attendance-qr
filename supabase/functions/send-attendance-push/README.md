# send-attendance-push

Edge Function que envía push a apoderados cuando se inserta un registro en
`buscontrol.bus_attendance_records`.

## Fase D — Seguridad webhook

La función exige el header **`x-webhook-secret`** con el mismo valor que la
variable de entorno **`WEBHOOK_SECRET`**. Sin secret válido → **401**.

**Alternativa (UI Database Webhook):** si el hook es tipo **Supabase Edge Functions**
(el dashboard no permite headers), la función también acepta llamadas con
`apikey` o `Authorization: Bearer` igual al **service role** (inyectado en la función;
no hace falta `WEBHOOK_SECRET` en ese caso).

## Despliegue

```bash
supabase functions deploy send-attendance-push --no-verify-jwt
```

### Secrets (Dashboard → Edge Functions → send-attendance-push → Secrets)

| Variable | Obligatorio | Notas |
|----------|-------------|--------|
| `SUPABASE_URL` | Sí | Automática en Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Automática en Supabase |
| `WEBHOOK_SECRET` | **Sí (Fase D)** | Cadena larga aleatoria; misma en el webhook |

Generar secret (ejemplo local):

```bash
openssl rand -hex 32
```

## SQL previo

1. `supabase/migrations/009_push_notifications.sql`
2. **`supabase/migrations/015_phase_d_webhook_hardening.sql`** (idempotencia + `attendance_record_id`)

## Webhook (Database → Edge Function)

Dashboard → **Database → Webhooks**

### Opción recomendada — HTTP Request

| Campo | Valor |
|-------|--------|
| Name | `attendance-push` |
| Table | `bus_attendance_records` |
| Schema | `buscontrol` |
| Events | **Insert** |
| Type | **HTTP Request** |
| URL | `https://<PROJECT_REF>.supabase.co/functions/v1/send-attendance-push` |
| Method | POST |
| Headers | `x-webhook-secret: <mismo WEBHOOK_SECRET>` |
| | `Content-Type: application/json` |

### Si el webhook se guarda como “Supabase Edge Function”

El dashboard **fuerza** ese tipo cuando la URL es `.../functions/v1/send-attendance-push`.
**Está bien** — no hace falta HTTP Request ni `x-webhook-secret` si redeployas la función
con soporte service-role (código actual). Solo:

1. Webhook: `buscontrol.bus_attendance_records` · **Insert** · función `send-attendance-push`
2. Redeploy función (paso C abajo)
3. Probar escaneo en celular

`WEBHOOK_SECRET` es **opcional** si usas solo el webhook tipo Edge Function.

## Eventos que notifican

| event_type | direction | event_key |
|------------|-----------|-----------|
| subio / manual | recojo | recojo_subio |
| bajo | recojo | recojo_bajo |
| subio / manual | retorno | retorno_subio |
| bajo | retorno | retorno_bajo |

No notifica: `ausente`, registros con `voided_at`, apoderados sin token activo.

## Idempotencia

Tras resolver `event_key`, inserta en `push_webhook_receipts`. Si el webhook se
reintenta → `duplicate_webhook` y no vuelve a enviar push.

## Verificación Fase D

```bash
# Sin secret → 401
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-attendance-push" \
  -H "Content-Type: application/json" \
  -d '{"record":{"id":"00000000-0000-0000-0000-000000000000"}}'

# Con secret → no 401 (puede skipped por registro inválido)
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-attendance-push" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <WEBHOOK_SECRET>" \
  -d '{"record":{"id":"00000000-0000-0000-0000-000000000000"}}'
```

Escanear un alumno en viaje activo → push al padre como antes.

## Apoderados destino

Usa `buscontrol.guardian_user_ids_for_student(student_id)`:

- `bus_guardians.auth_user_id` + `bus_student_guardians` (catálogo municipal)
- `student_guardians.guardian_user_id` (fallback)

## Mobile

Padres registran token en `device_push_tokens` al iniciar sesión.
Requiere **EAS Build** + `extra.eas.projectId` en `mobile/app.json`.

## Observabilidad

```sql
SELECT * FROM buscontrol.v_push_delivery_failures LIMIT 20;
SELECT buscontrol.push_failure_count(24);
```

Logs: `[send-attendance-push] start` / `done`
