/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { isDeadPushToken, sendExpoPushMessages, type PushMessage } from "./lib/expo-push.ts";
import {
  buildAttendancePushNotification,
  resolvePushEventKey,
} from "./lib/templates.ts";
import type { AttendanceWebhookRecord } from "./lib/types.ts";

type DatabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: AttendanceWebhookRecord;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function resolveSupabaseSecretKeys(): string[] {
  const keys: string[] = [];
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) {
    keys.push(legacy);
  }

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const value of Object.values(parsed)) {
        if (typeof value === "string" && value.trim()) {
          keys.push(value.trim());
        }
      }
    } catch {
      console.warn("[send-attendance-push] No se pudo parsear SUPABASE_SECRET_KEYS");
    }
  }

  return [...new Set(keys)];
}

function getSupabaseAdminKey(): string | null {
  const keys = resolveSupabaseSecretKeys();
  return keys[0] ?? null;
}

function isAuthorizedWebhookRequest(request: Request): boolean {
  const expectedSecret = Deno.env.get("WEBHOOK_SECRET")?.trim();
  const webhookSecret =
    request.headers.get("x-webhook-secret")?.trim() ??
    request.headers.get("X-Webhook-Secret")?.trim();

  if (expectedSecret && webhookSecret === expectedSecret) {
    return true;
  }

  const secretKeys = resolveSupabaseSecretKeys();
  if (!secretKeys.length) {
    return false;
  }

  const apiKey = request.headers.get("apikey")?.trim();
  const authorization = request.headers.get("Authorization")?.trim();

  for (const key of secretKeys) {
    if (apiKey === key || authorization === `Bearer ${key}`) {
      return true;
    }
  }

  return false;
}

function assertWebhookAuthorized(request: Request): Response | null {
  if (isAuthorizedWebhookRequest(request)) {
    return null;
  }

  console.warn("[send-attendance-push] Webhook no autorizado");
  return jsonResponse({ error: "Unauthorized" }, 401);
}

function extractRecord(payload: DatabaseWebhookPayload): AttendanceWebhookRecord | null {
  if (payload.record?.id) {
    return payload.record;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authError = assertWebhookAuthorized(request);
  if (authError) {
    return authError;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getSupabaseAdminKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase env vars" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "buscontrol" },
  });

  const supabasePublic = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "public" },
  });

  let payload: DatabaseWebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const record = extractRecord(payload);

  if (!record) {
    console.warn("[send-attendance-push] skipped: missing_record");
    return jsonResponse({ skipped: true, reason: "missing_record" });
  }

  console.info("[send-attendance-push] start", {
    attendance_record_id: record.id,
    event_type: record.event_type,
    student_id: record.student_id,
    trip_id: record.trip_id,
  });

  if (record.voided_at) {
    return jsonResponse({ skipped: true, reason: "voided_on_insert" });
  }

  const { data: freshRecord, error: freshError } = await supabase
    .from("bus_attendance_records")
    .select("voided_at, event_type, trip_id, student_id")
    .eq("id", record.id)
    .maybeSingle();

  if (freshError) {
    console.error("[send-attendance-push] error", { step: "fresh_record", message: freshError.message });
    return jsonResponse({ error: freshError.message }, 500);
  }

  if (!freshRecord || freshRecord.voided_at) {
    return jsonResponse({ skipped: true, reason: "voided_before_send" });
  }

  const { data: trip, error: tripError } = await supabase
    .from("bus_trips")
    .select("direction")
    .eq("id", freshRecord.trip_id)
    .maybeSingle();

  if (tripError || !trip) {
    console.error("[send-attendance-push] error", {
      step: "trip_lookup",
      message: tripError?.message ?? "trip_not_found",
      trip_id: freshRecord.trip_id,
    });
    return jsonResponse({ error: tripError?.message ?? "trip_not_found" }, 500);
  }

  const eventKey = resolvePushEventKey(freshRecord.event_type, trip.direction);

  if (!eventKey) {
    return jsonResponse({ skipped: true, reason: "non_push_event" });
  }

  const { error: receiptError } = await supabase.from("push_webhook_receipts").insert({
    attendance_record_id: record.id,
    event_key: eventKey,
  });

  if (receiptError?.code === "23505") {
    return jsonResponse({ skipped: true, reason: "duplicate_webhook" });
  }

  if (receiptError) {
    console.error("[send-attendance-push] error", {
      step: "push_webhook_receipts",
      message: receiptError.message,
      code: receiptError.code,
      hint: "Ejecuta supabase/migrations/015_phase_d_webhook_hardening.sql si la tabla no existe",
    });
    return jsonResponse({ error: receiptError.message }, 500);
  }

  const { data: student, error: studentError } = await supabasePublic
    .from("social_bus_escolar")
    .select("nombre_alumno")
    .eq("id", freshRecord.student_id)
    .maybeSingle();

  if (studentError || !student) {
    console.error("[send-attendance-push] error", {
      step: "student_lookup",
      message: studentError?.message ?? "student_not_found",
      student_id: freshRecord.student_id,
    });
    return jsonResponse({ error: studentError?.message ?? "student_not_found" }, 500);
  }

  const notification = buildAttendancePushNotification(eventKey, student.nombre_alumno);

  const { data: guardianIds, error: guardiansError } = await supabase.rpc(
    "guardian_user_ids_for_student",
    { p_student_id: freshRecord.student_id },
  );

  if (guardiansError) {
    console.error("[send-attendance-push] error", {
      step: "guardian_rpc",
      message: guardiansError.message,
      hint: "Ejecuta supabase/migrations/009_push_notifications.sql si falta la RPC",
    });
    return jsonResponse({ error: guardiansError.message }, 500);
  }

  const uniqueGuardianIds = [...new Set((guardianIds ?? []) as string[])];

  if (!uniqueGuardianIds.length) {
    return jsonResponse({ skipped: true, reason: "no_guardians" });
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const guardianUserId of uniqueGuardianIds) {
    const { data: preference } = await supabase
      .from("guardian_notification_preferences")
      .select("is_enabled")
      .eq("guardian_user_id", guardianUserId)
      .eq("event_key", eventKey)
      .maybeSingle();

    if (preference && preference.is_enabled === false) {
      await supabase.from("notification_log").insert({
        guardian_user_id: guardianUserId,
        student_id: freshRecord.student_id,
        attendance_record_id: record.id,
        event_key: eventKey,
        title: notification.title,
        body: notification.body,
        delivery_status: "skipped",
      });
      skippedCount += 1;
      continue;
    }

    const { data: tokens, error: tokensError } = await supabase
      .from("device_push_tokens")
      .select("expo_push_token")
      .eq("user_id", guardianUserId)
      .eq("is_active", true);

    if (tokensError) {
      failedCount += 1;
      await supabase.from("notification_log").insert({
        guardian_user_id: guardianUserId,
        student_id: freshRecord.student_id,
        attendance_record_id: record.id,
        event_key: eventKey,
        title: notification.title,
        body: notification.body,
        delivery_status: "failed",
      });
      continue;
    }

    if (!tokens?.length) {
      skippedCount += 1;
      await supabase.from("notification_log").insert({
        guardian_user_id: guardianUserId,
        student_id: freshRecord.student_id,
        attendance_record_id: record.id,
        event_key: eventKey,
        title: notification.title,
        body: notification.body,
        delivery_status: "skipped",
      });
      continue;
    }

    const messages: PushMessage[] = tokens.map((tokenRow) => ({
      to: tokenRow.expo_push_token,
      title: notification.title,
      body: notification.body,
      sound: "default",
      channelId: "bus-attendance",
      data: {
        event_key: eventKey,
        student_id: freshRecord.student_id,
        attendance_record_id: record.id,
      },
    }));

    try {
      const tickets = await sendExpoPushMessages(messages);
      let guardianSent = false;
      let guardianFailed = false;

      for (let index = 0; index < tickets.length; index += 1) {
        const ticket = tickets[index];
        const token = tokens[index]?.expo_push_token;

        if (ticket.status === "ok") {
          guardianSent = true;
          continue;
        }

        guardianFailed = true;

        if (token && isDeadPushToken(ticket)) {
          await supabase
            .from("device_push_tokens")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", guardianUserId)
            .eq("expo_push_token", token);
        }
      }

      await supabase.from("notification_log").insert({
        guardian_user_id: guardianUserId,
        student_id: freshRecord.student_id,
        attendance_record_id: record.id,
        event_key: eventKey,
        title: notification.title,
        body: notification.body,
        delivery_status: guardianSent ? "sent" : guardianFailed ? "failed" : "skipped",
      });

      if (guardianSent) {
        sentCount += 1;
      } else if (guardianFailed) {
        failedCount += 1;
      } else {
        skippedCount += 1;
      }
    } catch (pushError) {
      failedCount += 1;
      await supabase.from("notification_log").insert({
        guardian_user_id: guardianUserId,
        student_id: freshRecord.student_id,
        attendance_record_id: record.id,
        event_key: eventKey,
        title: notification.title,
        body: notification.body,
        delivery_status: "failed",
      });

      console.error("[send-attendance-push]", pushError);
    }
  }

  const summary = {
    ok: true,
    event_key: eventKey,
    attendance_record_id: record.id,
    guardians: uniqueGuardianIds.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
  };

  console.info("[send-attendance-push] done", summary);

  return jsonResponse(summary);
});
