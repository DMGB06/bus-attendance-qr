import {
  formatTripTitle,
  getDropoffLabel,
  getRosterListHeaderLabel,
  getRosterStatusLabel,
} from "@/src/features/trips/domain/trip-labels";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

const statusItem = (status: TripRosterItem["status"], event_type?: string) =>
  ({ status, attendance: event_type ? { event_type } : null }) as unknown as TripRosterItem;

describe("trip-labels", () => {
  it("el titulo usa el turno y, sin turno, la direccion", () => {
    expect(formatTripTitle({ direction: "retorno", turn_type: "tarde_primaria" })).toBe("Tarde primaria");
    expect(formatTripTitle({ direction: "recojo", turn_type: null })).toBe("Viaje Recojo");
  });

  it("el destino de bajada depende de la direccion", () => {
    expect(getDropoffLabel("recojo")).toBe("En colegio");
    expect(getDropoffLabel("retorno")).toBe("En casa");
  });

  it("el encabezado de la lista sigue al filtro y a la direccion", () => {
    expect(getRosterListHeaderLabel("pending", "retorno")).toBe("Faltan");
    expect(getRosterListHeaderLabel("completed", "recojo")).toBe("En colegio");
    expect(getRosterListHeaderLabel("all", "recojo")).toBe("Alumnos");
  });

  it("el estado del alumno distingue cada caso", () => {
    expect(getRosterStatusLabel(statusItem("pending"), "recojo")).toBe("Pendiente");
    expect(getRosterStatusLabel(statusItem("completed", "ausente"), "recojo")).toBe("Ausente");
    expect(getRosterStatusLabel(statusItem("completed", "bajo"), "retorno")).toBe("En casa");
    expect(getRosterStatusLabel(statusItem("onboard", "manual"), "recojo")).toBe("Manual");
    expect(getRosterStatusLabel(statusItem("onboard", "subio"), "recojo")).toBe("A bordo");
  });
});
