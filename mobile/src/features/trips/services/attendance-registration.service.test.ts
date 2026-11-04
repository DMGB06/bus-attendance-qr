import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  flushAttendanceQueue,
  pruneStaleQueueEntriesForTrip,
  refreshRosterFromNetwork,
  syncAttendanceToServer,
} from "@/src/features/trips/services/attendance-registration.service";
import {
  registerAttendance,
  registerDropoffAttendance,
} from "@/src/features/trips/services/attendance.service";
import { getScanContextForCurrentUser } from "@/src/features/trips/services/crew.service";
import { getTripAttendanceOnly, getTripRosterRaw } from "@/src/features/trips/services/trip-roster.service";
import {
  enqueueAttendanceWrite,
  loadAttendanceQueue,
} from "@/src/features/trips/storage/attendance-queue.storage";
import {
  loadCachedTripAttendance,
  saveCachedStudents,
} from "@/src/features/trips/storage/roster-cache.storage";
import type { AttendanceRecord, Student } from "@/src/features/trips/types";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
      clear: async () => store.clear(),
    },
  };
});
jest.mock("@/src/features/trips/services/attendance.service", () => ({
  registerAttendance: jest.fn(),
  registerDropoffAttendance: jest.fn(),
  voidAttendanceRecord: jest.fn(),
}));
jest.mock("@/src/features/trips/services/crew.service", () => ({
  getScanContextForCurrentUser: jest.fn(),
}));
jest.mock("@/src/features/trips/services/trip-roster.service", () => ({
  getTripAttendanceOnly: jest.fn(),
  getTripRosterRaw: jest.fn(),
}));
jest.mock("@/src/features/trips/storage/roster-cache.storage", () => ({
  isStudentsCacheFresh: jest.fn(() => false),
  loadCachedRosterSnapshot: jest.fn(async () => null),
  loadCachedStudents: jest.fn(async () => null),
  loadCachedTripAttendance: jest.fn(async () => null),
  saveCachedStudents: jest.fn(async () => undefined),
  saveCachedTripAttendance: jest.fn(async () => undefined),
  saveCachedRosterSnapshot: jest.fn(async () => undefined),
}));

const register = registerAttendance as jest.Mock;
const registerDropoff = registerDropoffAttendance as jest.Mock;
const scanContext = getScanContextForCurrentUser as jest.Mock;
const attendanceOnly = getTripAttendanceOnly as jest.Mock;
const rosterRaw = getTripRosterRaw as jest.Mock;
const cachedAttendance = loadCachedTripAttendance as jest.Mock;
const saveStudents = saveCachedStudents as jest.Mock;

function enqueue(studentId: string, eventType: AttendanceRecord["event_type"] = "subio", scannedBy = "user-1") {
  return enqueueAttendanceWrite({ tripId: "trip-1", studentId, eventType, scannedBy });
}

function queuedStudents() {
  return loadAttendanceQueue().then((queue) => queue.map((entry) => entry.studentId));
}

describe("attendance-registration.service", () => {
  beforeEach(async () => {
    await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
    jest.clearAllMocks();
    register.mockResolvedValue({});
    registerDropoff.mockResolvedValue({});
    scanContext.mockResolvedValue({ scannedBy: "user-1", scanRole: "chofer" });
  });

  describe("flushAttendanceQueue", () => {
    it("sigue con las demas entradas tras un error permanente", async () => {
      await enqueue("stu-1");
      await enqueue("stu-2");
      await enqueue("stu-3");
      register.mockImplementation(async (_trip: string, studentId: string) => {
        if (studentId === "stu-2") {
          throw new Error("Alumno no encontrado en padrón activo.");
        }
        return {};
      });

      const flushed = await flushAttendanceQueue("trip-1");

      expect(flushed).toBe(2);
      expect(await queuedStudents()).toEqual(["stu-2"]);
    });

    it("se detiene sin perder nada ante un error de red", async () => {
      await enqueue("stu-1");
      await enqueue("stu-2");
      register.mockRejectedValue(new Error("Network request failed"));

      await flushAttendanceQueue("trip-1");

      expect(register).toHaveBeenCalledTimes(1);
      expect(await queuedStudents()).toEqual(["stu-1", "stu-2"]);
    });

    it("resuelve el contexto de escaneo una sola vez por flush", async () => {
      await enqueue("stu-1");
      await enqueue("stu-2");
      await enqueue("stu-3");

      await flushAttendanceQueue("trip-1");

      expect(scanContext).toHaveBeenCalledTimes(1);
    });

    it("sin sesion conserva la cola sin lanzar error", async () => {
      await enqueue("stu-1");
      scanContext.mockRejectedValue(new Error("Debes iniciar sesion."));

      await expect(flushAttendanceQueue("trip-1")).resolves.toBe(0);
      expect(await queuedStudents()).toEqual(["stu-1"]);
    });

    it("no sube registros encolados por otro usuario", async () => {
      await enqueue("stu-1", "subio", "otro-usuario");
      await enqueue("stu-2");

      await flushAttendanceQueue("trip-1");

      expect(register).toHaveBeenCalledTimes(1);
      expect(await queuedStudents()).toEqual(["stu-1"]);
    });
  });

  describe("pruneStaleQueueEntriesForTrip", () => {
    it("no borra entradas si no pudo consultar el servidor", async () => {
      await enqueue("stu-1");
      attendanceOnly.mockRejectedValue(new Error("Network request failed"));
      cachedAttendance.mockResolvedValue({
        records: [
          {
            id: "local-optimistic-1",
            trip_id: "trip-1",
            student_id: "stu-1",
            event_type: "subio",
            voided_at: null,
          },
        ],
      });

      const pruned = await pruneStaleQueueEntriesForTrip("trip-1");

      expect(pruned).toBe(0);
      expect(await queuedStudents()).toEqual(["stu-1"]);
    });
  });

  describe("syncAttendanceToServer", () => {
    it("encola si falla la red", async () => {
      register.mockRejectedValue(new Error("Network request failed"));

      await expect(syncAttendanceToServer("trip-1", "stu-1", "subio")).resolves.toEqual({
        status: "queued",
      });
      expect(await queuedStudents()).toEqual(["stu-1"]);
    });

    it("encola si la peticion se corto por timeout", async () => {
      register.mockRejectedValue(new Error("AbortError: Aborted"));

      await expect(syncAttendanceToServer("trip-1", "stu-1", "subio")).resolves.toEqual({
        status: "queued",
      });
    });

    it("no encola un error permanente al reintentar la bajada", async () => {
      await enqueue("stu-1", "subio");
      registerDropoff.mockRejectedValue(new Error("Viaje no activo."));
      registerDropoff.mockRejectedValueOnce(
        new Error("Primero debes registrar la entrada del alumno."),
      );

      await expect(syncAttendanceToServer("trip-1", "stu-1", "bajo")).rejects.toThrow(
        "Viaje no activo.",
      );
      const queue = await loadAttendanceQueue();
      expect(queue.some((entry) => entry.eventType === "bajo")).toBe(false);
    });

    it("reintenta la bajada subiendo antes la entrada pendiente", async () => {
      await enqueue("stu-1", "subio");
      registerDropoff.mockRejectedValueOnce(
        new Error("Primero debes registrar la entrada del alumno."),
      );

      await expect(syncAttendanceToServer("trip-1", "stu-1", "bajo")).resolves.toEqual({
        status: "synced",
      });
      expect(register).toHaveBeenCalledWith("trip-1", "stu-1", "subio", expect.anything());
      expect(await queuedStudents()).toEqual([]);
    });
  });

  describe("refreshRosterFromNetwork", () => {
    it("no sobrescribe el padron en cache con una lista vacia", async () => {
      rosterRaw.mockResolvedValue({ students: [], attendanceRecords: [] });

      await refreshRosterFromNetwork("trip-1", { skipQueueFlush: true });

      expect(saveStudents).not.toHaveBeenCalled();
    });

    it("guarda el padron cuando trae alumnos", async () => {
      const students = [{ id: "stu-1" } as Student];
      rosterRaw.mockResolvedValue({ students, attendanceRecords: [] });

      await refreshRosterFromNetwork("trip-1", { skipQueueFlush: true });

      expect(saveStudents).toHaveBeenCalledWith(students);
    });
  });
});
