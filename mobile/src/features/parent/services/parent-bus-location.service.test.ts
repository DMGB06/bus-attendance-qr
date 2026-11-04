import { buildBusLocationSnapshotFromChildren } from "@/src/features/parent/services/parent-bus-location.service";
import type { ParentChildSummary } from "@/src/features/parent/types";

jest.mock("@/src/features/parent/services/parent-children.service", () => ({
  getParentChildrenWithStatus: jest.fn(),
}));

function child(name: string, status: string | null): ParentChildSummary {
  return {
    student: { id: name, nombre_alumno: name },
    todayStatus: status ? { trip_id: "t1", status } : null,
    activeTrip: {
      id: "t1",
      status: "active",
      direction: "retorno",
      last_lat: -13,
      last_lng: -76,
      last_location_at: "2026-06-21T12:00:00Z",
    },
  } as unknown as ParentChildSummary;
}

describe("buildBusLocationSnapshotFromChildren", () => {
  it("muestra el bus mientras el hijo viaja", () => {
    const snapshot = buildBusLocationSnapshotFromChildren([child("Ana", "returning")]);

    expect(snapshot.locations).toHaveLength(1);
    expect(snapshot.hasActiveTrip).toBe(true);
  });

  it("deja de mostrar el bus cuando el hijo ya bajo", () => {
    const snapshot = buildBusLocationSnapshotFromChildren([child("Ana", "dropped_off")]);

    expect(snapshot.locations).toHaveLength(0);
    expect(snapshot.hasActiveTrip).toBe(false);
  });

  it("sigue mostrando el bus por el hermano que aun viaja", () => {
    const snapshot = buildBusLocationSnapshotFromChildren([
      child("Ana", "dropped_off"),
      child("Luis", "returning"),
    ]);

    expect(snapshot.locations[0].studentNames).toEqual(["Luis"]);
  });

  it("el estado de otro viaje no oculta el bus", () => {
    const other = child("Ana", "at_school");
    other.todayStatus = { ...other.todayStatus!, trip_id: "manana" };

    expect(buildBusLocationSnapshotFromChildren([other]).locations).toHaveLength(1);
  });
});
