import type { TripDirection } from "@/src/features/trips/types";

export type ChecklistStepStatus = "done" | "current" | "pending";

export type DailyChecklistStep = {
  id: string;
  label: string;
  hint?: string;
  status: ChecklistStepStatus;
};

export type DailyChecklistContext = {
  hasActiveTrip: boolean;
  direction: TripDirection | null;
  onboardCount: number;
  pendingCount: number;
  completedCount: number;
  morningRiderPendingCount: number;
  /** Sin rol asignado (V1): operador con permisos de chofer. */
  setupPeriod?: "mañana" | "tarde";
  /** Si false, oculta pasos de cierre (asistenta). */
  canCloseTrip?: boolean;
};

function withStatus(
  step: Omit<DailyChecklistStep, "status">,
  status: ChecklistStepStatus,
): DailyChecklistStep {
  return { ...step, status };
}

function buildActiveRecojoSteps(context: DailyChecklistContext): DailyChecklistStep[] {
  const { onboardCount, pendingCount, completedCount } = context;

  const steps: DailyChecklistStep[] = [
    withStatus({ id: "start", label: "Viaje iniciado" }, "done"),
    withStatus(
      {
        id: "scan_boarding",
        label: "Escanear al subir al bus",
        hint: pendingCount > 0 ? `${pendingCount} alumno(s) sin escanear` : undefined,
      },
      pendingCount > 0 ? "current" : onboardCount > 0 || completedCount > 0 ? "done" : "current",
    ),
    withStatus(
      {
        id: "scan_dropoff",
        label: "Registrar bajada en colegio",
        hint: onboardCount > 0 ? `${onboardCount} a bordo` : undefined,
      },
      onboardCount > 0 ? "current" : completedCount > 0 ? "done" : "pending",
    ),
    withStatus(
      {
        id: "close",
        label: "Cerrar viaje",
        hint: "Confirma antes de iniciar la tarde.",
      },
      onboardCount === 0 && pendingCount === 0 && completedCount > 0 ? "current" : "pending",
    ),
  ];

  return steps;
}

function buildActiveRetornoSteps(context: DailyChecklistContext): DailyChecklistStep[] {
  const { onboardCount, pendingCount, completedCount, morningRiderPendingCount } = context;

  const hasMorningPending = morningRiderPendingCount > 0;

  const steps: DailyChecklistStep[] = [
    withStatus({ id: "start", label: "Viaje iniciado" }, "done"),
  ];

  if (hasMorningPending) {
    steps.push(
      withStatus(
        {
          id: "morning_priority",
          label: "Escanear quienes vinieron en la mañana",
          hint: `${morningRiderPendingCount} pendiente(s) — banner amarillo`,
        },
        "current",
      ),
    );
  }

  const boardingStatus: ChecklistStepStatus = hasMorningPending
    ? "pending"
    : pendingCount > 0
      ? "current"
      : onboardCount > 0 || completedCount > 0
        ? "done"
        : "current";

  steps.push(
    withStatus(
      {
        id: "scan_boarding",
        label: "Escanear al subir al bus",
        hint: pendingCount > 0 ? `${pendingCount} sin escanear` : undefined,
      },
      boardingStatus,
    ),
    withStatus(
      {
        id: "scan_dropoff",
        label: "Registrar bajada en casa",
        hint: onboardCount > 0 ? `${onboardCount} a bordo` : undefined,
      },
      !hasMorningPending && pendingCount === 0 && onboardCount > 0 ? "current" : onboardCount > 0 ? "current" : completedCount > 0 ? "done" : "pending",
    ),
    withStatus(
      { id: "close", label: "Cerrar viaje" },
      !hasMorningPending && onboardCount === 0 && pendingCount === 0 && completedCount > 0
        ? "current"
        : "pending",
    ),
  );

  return steps;
}

function buildIdleChecklist(setupPeriod: "mañana" | "tarde"): DailyChecklistStep[] {
  if (setupPeriod === "mañana") {
    return [
      withStatus({ id: "start", label: "Iniciar viaje de mañana" }, "current"),
      withStatus({ id: "scan_boarding", label: "Escanear subidas al bus" }, "pending"),
      withStatus({ id: "scan_dropoff", label: "Registrar llegada al colegio" }, "pending"),
      withStatus(
        {
          id: "close",
          label: "Cerrar viaje de mañana",
          hint: "Necesario para que funcione bien la tarde.",
        },
        "pending",
      ),
    ];
  }

  return [
    withStatus(
      {
        id: "prep_morning",
        label: "Mañana cerrada correctamente",
        hint: "Si no, el banner amarillo no saldrá bien.",
      },
      "done",
    ),
    withStatus({ id: "start", label: "Iniciar viaje de tarde" }, "current"),
    withStatus(
      { id: "morning_priority", label: "Atender banner amarillo si aparece" },
      "pending",
    ),
    withStatus({ id: "scan_boarding", label: "Escanear subidas al bus" }, "pending"),
    withStatus({ id: "scan_dropoff", label: "Registrar bajada en casa" }, "pending"),
    withStatus({ id: "close", label: "Cerrar viaje de tarde" }, "pending"),
  ];
}

export function buildDailyChecklist(context: DailyChecklistContext): DailyChecklistStep[] {
  let steps: DailyChecklistStep[];

  if (!context.hasActiveTrip) {
    steps = buildIdleChecklist(context.setupPeriod ?? "mañana");
  } else if (context.direction === "retorno") {
    steps = buildActiveRetornoSteps(context);
  } else {
    steps = buildActiveRecojoSteps(context);
  }

  if (context.canCloseTrip === false) {
    steps = steps.filter((step) => step.id !== "close");
  }

  return steps;
}

export function getDailyChecklistTitle(context: DailyChecklistContext): string {
  if (!context.hasActiveTrip) {
    return context.setupPeriod === "tarde" ? "Checklist tarde" : "Checklist mañana";
  }

  return "Tu turno ahora";
}
