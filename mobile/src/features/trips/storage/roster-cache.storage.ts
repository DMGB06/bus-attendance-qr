import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceRecord, Student } from "@/src/features/trips/types";

const STUDENTS_KEY = "@buscontrol/roster/students";
const TRIP_ATTENDANCE_PREFIX = "@buscontrol/roster/attendance/";
const TRIP_ROSTER_PREFIX = "@buscontrol/roster/snapshot/";

type CachedStudents = {
  students: Student[];
  savedAt: string;
};

type CachedTripAttendance = {
  tripId: string;
  records: AttendanceRecord[];
  savedAt: string;
};

type CachedRosterSnapshot = {
  tripId: string;
  items: TripRosterItem[];
  savedAt: string;
};

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* cache write is best-effort */
  }
}

export async function loadCachedStudents(): Promise<CachedStudents | null> {
  return readJson<CachedStudents>(STUDENTS_KEY);
}

export async function saveCachedStudents(students: Student[]): Promise<void> {
  await writeJson(STUDENTS_KEY, {
    students,
    savedAt: new Date().toISOString(),
  } satisfies CachedStudents);
}

export async function loadCachedTripAttendance(
  tripId: string,
): Promise<CachedTripAttendance | null> {
  return readJson<CachedTripAttendance>(`${TRIP_ATTENDANCE_PREFIX}${tripId}`);
}

export async function saveCachedTripAttendance(
  tripId: string,
  records: AttendanceRecord[],
): Promise<void> {
  await writeJson(`${TRIP_ATTENDANCE_PREFIX}${tripId}`, {
    tripId,
    records,
    savedAt: new Date().toISOString(),
  } satisfies CachedTripAttendance);
}

export async function loadCachedRosterSnapshot(
  tripId: string,
): Promise<CachedRosterSnapshot | null> {
  return readJson<CachedRosterSnapshot>(`${TRIP_ROSTER_PREFIX}${tripId}`);
}

export async function saveCachedRosterSnapshot(
  tripId: string,
  items: TripRosterItem[],
): Promise<void> {
  await writeJson(`${TRIP_ROSTER_PREFIX}${tripId}`, {
    tripId,
    items,
    savedAt: new Date().toISOString(),
  } satisfies CachedRosterSnapshot);
}

export async function clearTripRosterCache(tripId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      `${TRIP_ATTENDANCE_PREFIX}${tripId}`,
      `${TRIP_ROSTER_PREFIX}${tripId}`,
    ]);
  } catch {
    /* non-fatal */
  }
}
