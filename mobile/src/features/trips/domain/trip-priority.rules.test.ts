import { getPrioritaryStudents } from "@/src/features/trips/domain/trip-priority.rules";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

const item = (id: string, status: TripRosterItem["status"]) =>
  ({ student: { id }, status }) as unknown as TripRosterItem;

describe("getPrioritaryStudents", () => {
  it("solo incluye a quienes vinieron en la manana y siguen pendientes", () => {
    const items = [item("vino", "pending"), item("subio", "onboard"), item("no-vino", "pending")];

    const result = getPrioritaryStudents(items, new Set(["vino", "subio"]));

    expect(result.map((entry) => entry.student.id)).toEqual(["vino"]);
  });
});
