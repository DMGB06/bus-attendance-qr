import {
  pickPreferredStudentTripStatus,
  pickPreferredStudentTripStatusForParent,
  resolveLinkedStudentPairs,
} from "@/src/features/parent/domain/parent-linked-students";
import type { ParentStudentLink } from "@/src/features/parent/types";
import type { Student } from "@/src/features/trips/types";

function makeLink(studentId: string): ParentStudentLink {
  return {
    id: "link-1",
    student_id: studentId,
    relationship: "padre",
    is_primary: true,
    created_at: "2026-01-01T00:00:00Z",
    source: "bus_student_guardians",
  };
}

function makeStudent(id: string, name: string): Student {
  return {
    id,
    nombre_alumno: name,
    dni_alumno: "12345678",
    edad: null,
    sexo: null,
    colegio: null,
    nivel_educativo: null,
    nombre_apoderado: null,
    telefono_apoderado: null,
    dni_apoderado: null,
    direccion: null,
    usuario_registro: null,
    created_at: "2026-01-01T00:00:00Z",
    codigo: null,
    foto_url: null,
    activo: true,
    notas: null,
  };
}

describe("resolveLinkedStudentPairs", () => {
  it("empareja por student_id del vínculo", () => {
    const student = makeStudent("student-a", "Cristofer");
    const pairs = resolveLinkedStudentPairs([makeLink("student-a")], [student]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.student.id).toBe("student-a");
  });

  it("si el vínculo tiene otro id, usa el alumno del padrón/RPC", () => {
    const student = makeStudent("student-real", "Cristofer");
    const pairs = resolveLinkedStudentPairs([makeLink("student-wrong")], [student]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.student.id).toBe("student-real");
  });
});

describe("pickPreferredStudentTripStatus", () => {
  it("prefiere at_school sobre pending de la tabla resumen", () => {
    const pending = {
      student_id: "s1",
      trip_id: "t1",
      trip_date: "2026-06-19",
      direction: "recojo" as const,
      status: "pending" as const,
      last_event_type: null,
      last_event_at: null,
      updated_at: "2026-06-19T10:00:00Z",
    };
    const atSchool = {
      ...pending,
      status: "at_school" as const,
      last_event_type: "bajo",
      last_event_at: "2026-06-19T19:44:00Z",
    };

    expect(pickPreferredStudentTripStatus(pending, atSchool).status).toBe("at_school");
  });
});

describe("pickPreferredStudentTripStatusForParent", () => {
  it("prefiere retorno tarde activo sobre recojo mañana completado", () => {
    const morningAtSchool = {
      student_id: "s1",
      trip_id: "trip-morning",
      trip_date: "2026-06-21",
      direction: "recojo" as const,
      status: "at_school" as const,
      last_event_type: "bajo",
      last_event_at: "2026-06-21T12:49:00Z",
      updated_at: "2026-06-21T12:49:00Z",
    };
    const afternoonReturning = {
      student_id: "s1",
      trip_id: "trip-afternoon",
      trip_date: "2026-06-21",
      direction: "retorno" as const,
      status: "returning" as const,
      last_event_type: "subio",
      last_event_at: "2026-06-21T14:37:00Z",
      updated_at: "2026-06-21T14:37:00Z",
    };
    const tripMap = new Map([
      ["trip-morning", { status: "completed" }],
      ["trip-afternoon", { status: "active" }],
    ]);

    expect(
      pickPreferredStudentTripStatusForParent(
        morningAtSchool,
        afternoonReturning,
        tripMap,
      ).status,
    ).toBe("returning");
  });
});
