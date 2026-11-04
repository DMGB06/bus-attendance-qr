import {
  patchRosterItemsForBulkDropoff,
  patchRosterItemsForEvent,
} from "@/src/features/trips/domain/trip-roster.optimistic";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

const item = (id: string, status: TripRosterItem["status"] = "pending") =>
  ({ student: { id }, status, attendance: null, isPendingSync: false }) as unknown as TripRosterItem;

describe("trip-roster.optimistic", () => {
  it("subir deja al alumno a bordo y pendiente de sincronizar", () => {
    const [patched] = patchRosterItemsForEvent([item("s1")], "t1", "s1", "subio");

    expect(patched).toMatchObject({ status: "onboard", canMarkExit: true, isPendingSync: true });
    expect(patched.attendance?.id).toMatch(/^patch-/);
  });

  it("bajar o estar ausente completa al alumno", () => {
    expect(patchRosterItemsForEvent([item("s1")], "t1", "s1", "bajo")[0].status).toBe("completed");
    expect(patchRosterItemsForEvent([item("s1")], "t1", "s1", "ausente")[0].status).toBe("completed");
  });

  it("no toca a los demas alumnos", () => {
    const other = item("s2");
    expect(patchRosterItemsForEvent([item("s1"), other], "t1", "s1", "subio")[1]).toBe(other);
  });

  it("la bajada masiva marca solo a los indicados", () => {
    const patched = patchRosterItemsForBulkDropoff(
      [item("s1", "onboard"), item("s2", "onboard")],
      "t1",
      ["s1"],
    );

    expect(patched.map((entry) => entry.status)).toEqual(["completed", "onboard"]);
  });
});
