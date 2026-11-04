import {
  applyOptimisticRegistration,
  flushAttendanceQueue,
  refreshRosterFromNetwork,
  syncAttendanceToServer,
  validateRegistration,
} from "@/src/features/trips/services/attendance-registration.service";
import {
  getRosterMetaSnapshot,
  getRosterSnapshot,
  rosterStoreActions,
} from "@/src/features/trips/store/rosterStore";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

jest.mock("react-native", () => ({
  InteractionManager: { runAfterInteractions: (task: () => void) => task() },
}));
jest.mock("@/src/features/trips/services/attendance-registration.service", () => ({
  applyOptimisticBulkDropoff: jest.fn(),
  applyOptimisticRegistration: jest.fn(async () => []),
  collectBulkDropoffTargets: jest.fn(),
  flushAttendanceQueue: jest.fn(async () => 0),
  pruneStaleQueueEntriesForTrip: jest.fn(async () => 0),
  refreshRosterFromNetwork: jest.fn(),
  syncBulkDropoffToServer: jest.fn(),
  syncAttendanceToServer: jest.fn(),
  undoPendingRegistration: jest.fn(),
  validateRegistration: jest.fn(() => null),
  voidSyncedAttendanceRecord: jest.fn(),
}));
jest.mock("@/src/features/trips/storage/roster-cache.storage", () => ({
  isStudentsCacheFresh: jest.fn(() => false),
  loadCachedRosterSnapshot: jest.fn(async () => null),
  loadCachedStudents: jest.fn(async () => null),
  saveCachedRosterSnapshot: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/trips/storage/attendance-queue.storage", () => ({
  countPendingForTrip: jest.fn(async () => 0),
}));

const network = refreshRosterFromNetwork as jest.Mock;
const flush = flushAttendanceQueue as jest.Mock;
const syncToServer = syncAttendanceToServer as jest.Mock;
const applyOptimistic = applyOptimisticRegistration as jest.Mock;

const item = (id: string, status: TripRosterItem["status"] = "pending") =>
  ({
    student: { id },
    status,
    attendance: null,
    hasAttendance: false,
    canMarkManual: status === "pending",
    canMarkExit: status === "onboard",
    isPendingSync: false,
    pendingScannedBy: null,
  }) as unknown as TripRosterItem;

const networkResult = (items: TripRosterItem[]) => ({ items, fromCache: false, cacheSavedAt: null });
const flushPromises = async () => {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
};

describe("rosterStore", () => {
  beforeEach(async () => {
    rosterStoreActions.clearRosterStore();
    jest.clearAllMocks();
    (validateRegistration as jest.Mock).mockReturnValue(null);
    network.mockResolvedValue(networkResult([item("stu-1")]));
    await rosterStoreActions.refreshTripRoster("t1", { silent: false });
    network.mockClear();
  });

  afterEach(() => jest.useRealTimers());

  it("revierte la marca optimista si el registro falla", async () => {
    syncToServer.mockRejectedValue(new Error("Viaje no activo."));

    await expect(
      rosterStoreActions.registerStudentAttendance("t1", "stu-1", "subio"),
    ).rejects.toThrow("Viaje no activo.");

    expect(getRosterSnapshot().items[0].status).toBe("pending");
  });

  it("no ejecuta dos sincronizaciones a la vez", async () => {
    let finish: (value: number) => void = () => undefined;
    flush.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const first = rosterStoreActions.syncPendingWrites("t1");
    const second = rosterStoreActions.syncPendingWrites("t1");
    finish(0);
    await Promise.all([first, second]);

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("una recarga forzada no se pierde si ya hay otra en curso", async () => {
    let finish: (value: unknown) => void = () => undefined;
    network.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    network.mockResolvedValue(networkResult([item("stu-2")]));

    const running = rosterStoreActions.refreshTripRoster("t1", { silent: false });
    const forced = rosterStoreActions.refreshTripRoster("t1", {
      silent: true,
      force: true,
      immediate: true,
    });
    finish(networkResult([item("stu-1")]));
    await Promise.all([running, forced]);

    expect(network).toHaveBeenCalledTimes(2);
    expect(getRosterSnapshot().items[0].student.id).toBe("stu-2");
  });

  it("un cambio de otro dispositivo refresca aunque se acabe de recargar", async () => {
    jest.useFakeTimers();

    void rosterStoreActions.refreshTripRoster("t1", { silent: true, force: true });
    await jest.advanceTimersByTimeAsync(5_000);
    await flushPromises();

    expect(network).toHaveBeenCalledTimes(1);
  });

  it("escribe en cache un registro a la vez", async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    applyOptimistic.mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)));
    syncToServer.mockResolvedValue({ status: "queued" });
    network.mockResolvedValue(networkResult([item("stu-1"), item("stu-2")]));
    await rosterStoreActions.refreshTripRoster("t1", { silent: false });

    const first = rosterStoreActions.registerStudentAttendance("t1", "stu-1", "subio");
    const second = rosterStoreActions.registerStudentAttendance("t1", "stu-2", "subio");
    await flushPromises();
    expect(applyOptimistic).toHaveBeenCalledTimes(1);

    finishFirst([]);
    await Promise.all([first, second]);
    await flushPromises();
    expect(applyOptimistic).toHaveBeenCalledTimes(2);
  });

  it("mantiene el mismo objeto de meta si la meta no cambio", async () => {
    const before = getRosterMetaSnapshot("t1");

    network.mockResolvedValue(networkResult([item("stu-1", "onboard")]));
    await rosterStoreActions.refreshTripRoster("t1", { silent: true, immediate: true });

    expect(getRosterMetaSnapshot("t1")).toBe(before);
  });
});
