import test from "node:test";
import assert from "node:assert/strict";
import { savings, PLANS } from "./landing-data.mjs";
test("kalkulator pokazuje aktywną oszczędność z założeń, bez ujemnych i NaN", () => {
  assert.equal(savings(20, 30, 5, 100).minutes, 500);
  assert.equal(savings(20, 30, 5, 100).value, (500 / 60) * 100);
  assert.equal(savings(20, 5, 30, 100).minutes, 0);
  assert.equal(savings(NaN, 30, 5, 100).minutes, 0);
});
test("cennik liczy koszt rolki z pełnego limitu i zachowuje osobną pulę poprawek", () => {
  assert.deepEqual(
    PLANS.map((p) => [p.price, p.reels, p.tokens]),
    [
      [129, 15, 250000],
      [299, 50, 1000000],
      [699, 150, 3000000],
    ],
  );
});
