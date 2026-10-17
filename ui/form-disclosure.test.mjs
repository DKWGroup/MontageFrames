import test from "node:test";
import assert from "node:assert/strict";
import { revealInvalidField } from "./form-disclosure.mjs";

test("błąd rozwija wszystkie ukryte sekcje i skupia pole bez utraty draftu", () => {
  const outer = { open: false, parentElement: null };
  const inner = { open: false, parentElement: { closest: () => outer } };
  let focused = false;
  const field = {
    value: "draft",
    closest: () => inner,
    focus() {
      focused = true;
    },
  };
  revealInvalidField({ target: field });
  assert.equal(inner.open, true);
  assert.equal(outer.open, true);
  assert.equal(focused, true);
  assert.equal(field.value, "draft");
});

test("pole poza sekcją nadal otrzymuje fokus", () => {
  let focused = false;
  revealInvalidField({
    target: {
      closest: () => null,
      focus() {
        focused = true;
      },
    },
  });
  assert.equal(focused, true);
  assert.doesNotThrow(() => revealInvalidField({ target: null }));
});
