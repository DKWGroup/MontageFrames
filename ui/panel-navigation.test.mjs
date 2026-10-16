import test from "node:test";
import assert from "node:assert/strict";
import { panelModule } from "./panel-navigation.mjs";

test("adresy modułów nie stają się nazwami rolek, także po odświeżeniu i Wstecz", () => {
  for (const hash of ["#motion", "#motion/"])
    assert.equal(panelModule(hash), "motion");
  for (const hash of ["#lf", "#lf/wywiad/ciecia"])
    assert.equal(panelModule(hash), "longform");
  for (const hash of ["#qc", "#qc/project/candidate"])
    assert.equal(panelModule(hash), "quickcontent");
  for (const hash of ["", "#", "#moja-rolka", "#lf-inna", "#motion-demo"])
    assert.equal(panelModule(hash), "reels");
});
