// Ejecutar: node lib/session-limits.check.mjs
import assert from "node:assert/strict";
import { IDLE_SECONDS as IDLE, MAX_SECONDS as MAX, sessionExpired as expired } from "./session-limits.ts";

const now = 1_000_000;
assert.equal(expired(now, now, now), false, "sesion recien iniciada");
assert.equal(expired(now, now - IDLE, now), false, "justo en el limite de inactividad");
assert.equal(expired(now, now - IDLE - 1, now), true, "inactividad vencida");
assert.equal(expired(now, now, now - MAX), false, "justo en el limite total");
assert.equal(expired(now, now, now - MAX - 1), true, "limite total vencido aunque haya actividad");
assert.equal(expired(now, 0, 0), false, "sin datos todavia");
assert.equal(expired(now, NaN, 0), false, "cookie invalida");
console.log("ok");
