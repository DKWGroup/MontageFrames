import test from "node:test";
import assert from "node:assert/strict";
import { pageRoute } from "./page-route.mjs";
test("sekcje strony nie otwierają edytora i stare linki rolek pozostają obsługiwane", () => {
  for (const hash of ["", "#cennik", "#jak-dziala", "#faq"])
    assert.equal(pageRoute("/", hash), "landing");
  for (const hash of ["", "#qc/new", "#lf/p/ciecia"])
    assert.equal(pageRoute("/panel", hash), "panel");
  assert.equal(pageRoute("/", "#bisanz-ksiazulo"), "legacy-panel");
  assert.equal(pageRoute("/", "#qc/new"), "legacy-panel");
});
