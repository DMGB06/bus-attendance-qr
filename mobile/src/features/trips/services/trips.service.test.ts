import { formatSupabaseError } from "@/src/features/trips/services/trips.service";

jest.mock("@/src/core/config/supabase", () => ({ supabase: {} }));
jest.mock("@/src/features/auth/services/auth.service", () => ({ getUser: jest.fn() }));
jest.mock("@/src/features/profile/services/profile.service", () => ({ getProfileById: jest.fn() }));
jest.mock("@/src/features/trips/services/crew.service", () => ({
  getAssignedBusForToday: jest.fn(),
  resolveOperationalBusContext: jest.fn(),
}));

describe("formatSupabaseError", () => {
  it("muestra tal cual los mensajes escritos para el usuario en la base de datos", () => {
    expect(
      formatSupabaseError("No se pudo iniciar el viaje", {
        message: "Ya hay un viaje activo en esta unidad.",
        code: "P0001",
      }),
    ).toBe("Ya hay un viaje activo en esta unidad.");
  });

  it("no filtra detalles tecnicos de otros errores", () => {
    const postgresError = { message: "duplicate key", details: "Key (id)=(1)", code: "23505" };

    expect(formatSupabaseError("No se pudo iniciar el viaje", postgresError)).toBe(
      "No se pudo iniciar el viaje.",
    );
  });
});
