import { deriveStudentTripStatusValue } from "@/src/features/parent/domain/parent-status-from-attendance";

const event = (event_type: string, scanned_at: string, voided_at: string | null = null) => ({
  event_type,
  scanned_at,
  voided_at,
});

describe("deriveStudentTripStatusValue", () => {
  it("usa el ultimo evento: subio otra vez despues de bajar", () => {
    const records = [
      event("subio", "2026-06-21T12:00:00Z"),
      event("bajo", "2026-06-21T12:10:00Z"),
      event("subio", "2026-06-21T12:20:00Z"),
    ];

    expect(deriveStudentTripStatusValue(records, "retorno")).toBe("returning");
  });

  it("una marca de ausente anterior no gana a un registro posterior", () => {
    const records = [event("ausente", "2026-06-21T12:00:00Z"), event("subio", "2026-06-21T12:05:00Z")];

    expect(deriveStudentTripStatusValue(records, "recojo")).toBe("onboard");
  });

  it("ordena por fecha real aunque cambie el formato del texto", () => {
    const records = [
      event("bajo", "2026-06-21T12:00:00.5+00:00"),
      event("subio", "2026-06-21T12:00:00.123456+00:00"),
    ];

    expect(deriveStudentTripStatusValue(records, "recojo")).toBe("at_school");
  });

  it("ignora los anulados", () => {
    const records = [
      event("subio", "2026-06-21T12:00:00Z"),
      event("bajo", "2026-06-21T12:10:00Z", "2026-06-21T12:11:00Z"),
    ];

    expect(deriveStudentTripStatusValue(records, "recojo")).toBe("onboard");
  });

  it("sin registros queda pendiente", () => {
    expect(deriveStudentTripStatusValue([], "recojo")).toBe("pending");
  });
});
