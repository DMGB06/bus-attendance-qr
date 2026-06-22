# BusControl — verificación push (Supabase en vivo)

Generado: 21/6/2026, 10:21:00 p. m.

**1 OK** · **1 fallos** · **0 omitidos**

## ✅ Supabase URL

https://pbqgpvwbnkialeiooopp.supabase.co

## ❌ Service role key

Falta SUPABASE_SERVICE_ROLE_KEY en mobile/.env (Project Settings → API → secret key). No uses la anon key.

## Cómo corregir

1. Redeploy función: `supabase functions deploy send-attendance-push --project-ref pbqgpvwbnkialeiooopp --no-verify-jwt`
2. Webhook `attendance-push`: header `apikey` = secret key del proyecto
3. Padre en APK con permiso de notificaciones
