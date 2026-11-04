import { filterValidUuids, isUuid } from "@/src/shared/utils/uuid";

describe("isUuid", () => {
  it("acepta UUID v7, que Postgres puede generar", () => {
    expect(isUuid("01890a5d-ac96-774b-bcce-b302099a8057")).toBe(true);
  });

  it("acepta UUID v4 y rechaza texto que no lo es", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("BU0001")).toBe(false);
  });
});

describe("filterValidUuids", () => {
  it("quita duplicados y valores invalidos", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(filterValidUuids([id, ` ${id} `, "x"])).toEqual([id]);
  });
});
