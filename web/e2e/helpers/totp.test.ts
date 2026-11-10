import { expect, test } from "vitest";
import { totp } from "./totp";

// Vector de RFC 6238: secreto ASCII "12345678901234567890" en base32, t = 59 s -> 94287082 (8 digitos).
test("totp coincide con el vector de RFC 6238", () => {
  expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000, 8)).toBe("94287082");
});
