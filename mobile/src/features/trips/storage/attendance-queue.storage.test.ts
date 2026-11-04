import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  enqueueAttendanceWrite,
  hasQueuedWrite,
  loadAttendanceQueue,
  removeAttendanceWrite,
} from "@/src/features/trips/storage/attendance-queue.storage";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: async () => store.clear(),
    },
  };
});

const QUEUE_KEY = "@buscontrol/attendance-queue";
const CORRUPT_KEY = `${QUEUE_KEY}:corrupt`;
const storage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  clear: () => Promise<void>;
};

function write(studentId: string) {
  return {
    tripId: "trip-1",
    studentId,
    eventType: "subio" as const,
    scannedBy: "user-1",
  };
}

describe("attendance-queue.storage", () => {
  beforeEach(async () => {
    await storage.clear();
    jest.clearAllMocks();
  });

  it("conserva todas las entradas cuando se encolan a la vez", async () => {
    await Promise.all([
      enqueueAttendanceWrite(write("stu-1")),
      enqueueAttendanceWrite(write("stu-2")),
      enqueueAttendanceWrite(write("stu-3")),
    ]);

    const queue = await loadAttendanceQueue();
    expect(queue.map((entry) => entry.studentId).sort()).toEqual(["stu-1", "stu-2", "stu-3"]);
  });

  it("no pierde una entrada si se elimina otra a la vez", async () => {
    const first = await enqueueAttendanceWrite(write("stu-1"));

    await Promise.all([removeAttendanceWrite(first.id), enqueueAttendanceWrite(write("stu-2"))]);

    const queue = await loadAttendanceQueue();
    expect(queue.map((entry) => entry.studentId)).toEqual(["stu-2"]);
  });

  it("leer la cola no rompe la app si falla el almacenamiento", async () => {
    storage.getItem.mockRejectedValueOnce(new Error("io"));

    await expect(loadAttendanceQueue()).resolves.toEqual([]);
  });

  it("el registro de otra cuenta no bloquea el de la cuenta actual", async () => {
    await enqueueAttendanceWrite({ ...write("stu-1"), scannedBy: "otra" });

    expect(await hasQueuedWrite("trip-1", "stu-1", "subio", "user-1")).toBe(false);
    expect(await hasQueuedWrite("trip-1", "stu-1", "subio", "otra")).toBe(true);

    await enqueueAttendanceWrite(write("stu-1"));
    expect(await loadAttendanceQueue()).toHaveLength(2);
  });

  it("avisa al llamador si no pudo guardar en disco", async () => {
    storage.setItem.mockRejectedValueOnce(new Error("disk full"));

    await expect(enqueueAttendanceWrite(write("stu-1"))).rejects.toThrow("disk full");
  });

  it("respalda el contenido corrupto antes de que se sobrescriba", async () => {
    await storage.setItem(QUEUE_KEY, "{no es json");

    await enqueueAttendanceWrite(write("stu-1"));

    expect(await storage.getItem(CORRUPT_KEY)).toContain("{no es json");
    const queue = await loadAttendanceQueue();
    expect(queue.map((entry) => entry.studentId)).toEqual(["stu-1"]);
  });

  it("respalda entradas con forma invalida y conserva las validas", async () => {
    const valid = {
      id: "1",
      tripId: "trip-1",
      studentId: "stu-1",
      eventType: "subio",
      createdAt: "2026-06-21T12:00:00.000Z",
    };
    await storage.setItem(QUEUE_KEY, JSON.stringify([valid, { id: "2", tripId: "trip-1" }]));

    const queue = await loadAttendanceQueue();

    expect(queue).toEqual([valid]);
    expect(await storage.getItem(CORRUPT_KEY)).toContain('"id":"2"');
  });
});
