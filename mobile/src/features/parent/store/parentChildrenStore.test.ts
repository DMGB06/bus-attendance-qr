import { getParentChildrenWithStatus } from "@/src/features/parent/services/parent-children.service";
import { parentChildrenStore } from "@/src/features/parent/store/parentChildrenStore";
import type { ParentChildSummary } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

jest.mock("@/src/features/parent/services/parent-children.service", () => ({
  getParentChildrenWithStatus: jest.fn(),
}));

const fetchFromServer = getParentChildrenWithStatus as jest.Mock;
const child = (id: string, activeTrip: Partial<Trip> | null = null) =>
  ({ student: { id }, activeTrip }) as ParentChildSummary;

describe("parentChildrenStore", () => {
  beforeEach(() => {
    parentChildrenStore.clearParentChildrenStore();
    jest.clearAllMocks();
  });

  it("una respuesta en vuelo no repuebla el store tras cerrar sesion", async () => {
    let finish: (value: ParentChildSummary[]) => void = () => undefined;
    fetchFromServer.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const pending = parentChildrenStore.fetchChildren("u1");
    parentChildrenStore.clearParentChildrenStore();
    finish([child("stu-1")]);
    await pending;

    expect(parentChildrenStore.getSnapshot().children).toEqual([]);
    expect(parentChildrenStore.getSnapshot().userId).toBeNull();
  });

  it("un error en vuelo no ensucia el store tras cerrar sesion", async () => {
    let fail: (reason: Error) => void = () => undefined;
    fetchFromServer.mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));

    const pending = parentChildrenStore.fetchChildren("u1");
    parentChildrenStore.clearParentChildrenStore();
    fail(new Error("Network request failed"));
    await expect(pending).rejects.toThrow();

    expect(parentChildrenStore.getSnapshot().error).toBeNull();
  });

  describe("syncActiveTrips", () => {
    async function loadChildWithTrip() {
      fetchFromServer.mockResolvedValue([child("stu-1", { id: "t1", status: "active", turn_type: "tarde" })]);
      await parentChildrenStore.fetchChildren("u1");
    }

    it("quita el viaje que ya no sigue activo", async () => {
      await loadChildWithTrip();

      parentChildrenStore.syncActiveTrips(["t1"], []);

      expect(parentChildrenStore.getSnapshot().children[0].activeTrip).toBeNull();
    });

    it("actualiza el GPS sin perder los demas campos del viaje", async () => {
      await loadChildWithTrip();

      parentChildrenStore.syncActiveTrips(["t1"], [{ id: "t1", last_lat: -13 } as Trip]);

      expect(parentChildrenStore.getSnapshot().children[0].activeTrip).toMatchObject({
        turn_type: "tarde",
        last_lat: -13,
      });
    });

    it("no toca viajes que no se consultaron", async () => {
      await loadChildWithTrip();

      parentChildrenStore.syncActiveTrips(["otro"], []);

      expect(parentChildrenStore.getSnapshot().children[0].activeTrip).not.toBeNull();
    });
  });
});
