// Correr: node --test supabase/functions/guardian-account/lib/password.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { temporaryPassword } from "./password.ts";

test("la contrasena cumple la politica de Auth y no se repite", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const p = temporaryPassword();
    assert.equal(p.length, 16);
    assert.match(p, /[a-z]/);
    assert.match(p, /[A-Z]/);
    assert.match(p, /[0-9]/);
    assert.doesNotMatch(p, /[0O1lI]/);
    seen.add(p);
  }
  assert.equal(seen.size, 500);
});
