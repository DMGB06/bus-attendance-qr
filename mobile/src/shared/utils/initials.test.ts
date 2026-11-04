import { getInitials } from "@/src/shared/utils/initials";

describe("getInitials", () => {
  it("usa la primera letra de las dos primeras palabras", () => {
    expect(getInitials("ana maria alva")).toBe("AM");
  });

  it("con una sola palabra usa sus dos primeras letras", () => {
    expect(getInitials("ana")).toBe("AN");
  });

  it("sin texto devuelve vacio para que cada pantalla elija su respaldo", () => {
    expect(getInitials("   ")).toBe("");
  });
});
