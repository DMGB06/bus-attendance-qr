import { sanitizeIlikeSearchTerm } from "@/src/shared/utils/ilike";

describe("sanitizeIlikeSearchTerm", () => {
  it("elimina comodines ILIKE del término de búsqueda", () => {
    expect(sanitizeIlikeSearchTerm("  %martinez%  ")).toBe("martinez");
    expect(sanitizeIlikeSearchTerm("___")).toBe("");
    expect(sanitizeIlikeSearchTerm("a\\b")).toBe("ab");
  });
});
