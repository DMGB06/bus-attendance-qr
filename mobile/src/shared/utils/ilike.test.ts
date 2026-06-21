import { escapeIlikePattern, sanitizeIlikeSearchTerm } from "@/src/shared/utils/ilike";

describe("sanitizeIlikeSearchTerm", () => {
  it("elimina comodines ILIKE del término de búsqueda", () => {
    expect(sanitizeIlikeSearchTerm("  %martinez%  ")).toBe("martinez");
    expect(sanitizeIlikeSearchTerm("___")).toBe("");
    expect(sanitizeIlikeSearchTerm("a\\b")).toBe("ab");
  });
});

describe("escapeIlikePattern", () => {
  it("escapa comodines para patrones con ESCAPE", () => {
    expect(escapeIlikePattern("100%")).toBe("100\\%");
    expect(escapeIlikePattern("a_b")).toBe("a\\_b");
  });
});
