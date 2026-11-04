import {
  hasMissingPrioritarios,
  hasPendingDropoffIssues,
  sortCloseTripStudents,
  toCloseTripStudentRef,
} from "@/src/features/trips/domain/close-trip-validation";

const ref = (nombre_alumno: string) => toCloseTripStudentRef({ id: nombre_alumno, nombre_alumno });

describe("close-trip-validation", () => {
  it("ordena con las reglas del espanol", () => {
    const sorted = sortCloseTripStudents([ref("Oscar"), ref("Ñahui"), ref("Ana")]);

    expect(sorted.map((student) => student.nombre_alumno)).toEqual(["Ana", "Ñahui", "Oscar"]);
  });

  it("completa con null los datos que faltan", () => {
    expect(ref("Ana")).toEqual({ id: "Ana", nombre_alumno: "Ana", direccion: null, codigo: null });
  });

  it("detecta cada tipo de problema por separado", () => {
    const validation = { pendingDropoff: [ref("Ana")], missingPrioritarios: [] };

    expect(hasPendingDropoffIssues(validation)).toBe(true);
    expect(hasMissingPrioritarios(validation)).toBe(false);
  });
});
