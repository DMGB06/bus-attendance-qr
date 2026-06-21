import {
  canRegisterBoarding,
  canRegisterDropoff,
  findRosterItem,
} from "@/src/features/trips/domain/attendance.rules";
import { getDropoffLabel } from "@/src/features/trips/domain/trip-labels";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceEventType, TripDirection } from "@/src/features/trips/types";

export type ScannerIntent = "boarding" | "dropoff";

export type ResolvedScannerEvent =
  | {
      ok: true;
      intent: ScannerIntent;
      eventType: AttendanceEventType;
      confirmTitle: string;
      confirmSubtitle: string;
      confirmLabel: string;
      successMessage: (studentName: string) => string;
      queuedMessage: (studentName: string) => string;
    }
  | {
      ok: false;
      error: string;
    };

function boardingLabels() {
  return {
    confirmTitle: "Confirmar subida",
    confirmSubtitle: "Verifica los datos antes de registrar que el alumno subió al bus.",
    confirmLabel: "Confirmar subida",
    successMessage: (studentName: string) => `Subida registrada para ${studentName}.`,
    queuedMessage: (studentName: string) =>
      `Subida registrada para ${studentName}. Se sincronizará al recuperar señal.`,
  };
}

export function resolveScannerEvent(
  direction: TripDirection,
  rosterItem: TripRosterItem | undefined,
): ResolvedScannerEvent {
  if (!rosterItem || canRegisterBoarding(rosterItem)) {
    return {
      ok: true,
      intent: "boarding",
      eventType: "subio",
      ...boardingLabels(),
    };
  }

  if (canRegisterDropoff(rosterItem)) {
    return {
      ok: false,
      error:
        "Este alumno ya está a bordo. Registra la bajada desde la lista cuando llegue al destino.",
    };
  }

  if (rosterItem.attendance?.event_type === "ausente") {
    return { ok: false, error: "Este alumno ya fue marcado como ausente en este tramo." };
  }

  const place = getDropoffLabel(direction).toLowerCase();
  return { ok: false, error: `Este alumno ya fue registrado ${place}.` };
}

export function resolveScannerEventForStudent(
  direction: TripDirection,
  items: TripRosterItem[],
  studentId: string,
): ResolvedScannerEvent {
  return resolveScannerEvent(direction, findRosterItem(items, studentId));
}

export function getScannerAutoModeHint(_direction: TripDirection): string {
  return "Escanear al subir al bus";
}
