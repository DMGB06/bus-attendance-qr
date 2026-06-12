import {
  canRegisterAbsent,
  canRegisterBoarding,
  canRegisterDropoff,
  getDuplicateRegistrationMessage,
  hasBoardingInHistory,
  isBoardingEvent,
} from "@/src/features/trips/domain/attendance.rules";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceRecord, Student } from "@/src/features/trips/types";

const student = { id: "student-1" } as Student;

function rosterItem(status: TripRosterItem["status"]): TripRosterItem {
  return {
    student,
    status,
    attendance: null,
    hasAttendance: false,
    canMarkManual: status === "pending",
    canMarkExit: status === "onboard",
    isPendingSync: false,
    pendingScannedBy: null,
  };
}

describe("isBoardingEvent", () => {
  it("acepta subio y manual", () => {
    expect(isBoardingEvent("subio")).toBe(true);
    expect(isBoardingEvent("manual")).toBe(true);
    expect(isBoardingEvent("bajo")).toBe(false);
  });
});

describe("canRegisterBoarding", () => {
  it("permite si el alumno está pendiente", () => {
    expect(canRegisterBoarding(rosterItem("pending"))).toBe(true);
  });

  it("bloquea si ya está a bordo", () => {
    expect(canRegisterBoarding(rosterItem("onboard"))).toBe(false);
  });
});

describe("canRegisterDropoff", () => {
  it("solo permite si está a bordo", () => {
    expect(canRegisterDropoff(rosterItem("onboard"))).toBe(true);
    expect(canRegisterDropoff(rosterItem("pending"))).toBe(false);
  });
});

describe("canRegisterAbsent", () => {
  it("solo permite si está pendiente", () => {
    expect(canRegisterAbsent(rosterItem("pending"))).toBe(true);
    expect(canRegisterAbsent(rosterItem("onboard"))).toBe(false);
  });
});

describe("hasBoardingInHistory", () => {
  it("detecta subida previa", () => {
    const history = [{ event_type: "subio" } as AttendanceRecord];

    expect(hasBoardingInHistory(history)).toBe(true);
  });
});

describe("getDuplicateRegistrationMessage", () => {
  it("mensaje estándar para subida duplicada", () => {
    expect(getDuplicateRegistrationMessage("subio")).toBe("Ya registrado");
  });
});
