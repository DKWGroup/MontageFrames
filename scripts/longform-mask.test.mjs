import assert from "node:assert/strict";
import { test } from "node:test";
import { maskRange } from "./longform-mask.mjs";

test("maskRange: zapas 0,1 s, wyrównanie do klatek, granice filmu", () => {
  assert.deepEqual(maskRange(1, 2, 30), { from: 0.9, to: 2.1, key: "0.90-2.10" });
  assert.deepEqual(maskRange(0.02, 13.95, 30, 14), { from: 0, to: 14, key: "0.00-14.00" });
  const r = maskRange(1.234, 2.345, 30);
  assert.ok(Math.abs(r.from * 30 - Math.round(r.from * 30)) < 0.05 && Math.abs(r.to * 30 - Math.round(r.to * 30)) < 0.05);
});
