import assert from "node:assert/strict";
import { test } from "node:test";
import { clock, costLabel, formatOffset, frameLength, mutedAt, parseCrHash, playbackJump, syncLabel, waveColumns } from "./cutraw-view.mjs";

test("adres modułu: lista i projekt", () => {
  assert.deepEqual(parseCrHash("#cr"), { id: null });
  assert.deepEqual(parseCrHash("#cr/odc-12"), { id: "odc-12" });
  assert.equal(parseCrHash("#lf/odc"), null);
  assert.equal(parseCrHash("#cr/Zła"), null);
});

test("podgląd po cięciach: przeskok przez wycięte, granie w środku, koniec po ostatnim", () => {
  const segs = [{ start: 0.5, end: 2 }, { start: 3, end: 5 }];
  assert.equal(playbackJump(0.1, segs), 0.5);
  assert.equal(playbackJump(1, segs), null);
  assert.equal(playbackJump(1.98, segs), 3); // tuż przed końcem fragmentu — wyprzedzenie pętli klatek
  assert.equal(playbackJump(2.5, segs), 3);
  assert.equal(playbackJump(4.99, segs), -1);
  assert.equal(mutedAt(1.0, [{ start: 1.01, end: 1.3, ramp: 0.005 }]), false);
  assert.equal(mutedAt(1.006, [{ start: 1.01, end: 1.3, ramp: 0.005 }]), true);
});

test("etykiety: czas, offset, klatka, synchronizacja, koszt", () => {
  assert.deepEqual([clock(39.4), clock(3725)], ["0:39", "1:02:05"]);
  assert.deepEqual([formatOffset(1.69994), formatOffset(-2.3), formatOffset(0)], ["+1,700 s", "−2,300 s", "0 s"]);
  assert.equal(frameLength("25/1"), 0.04);
  assert.ok(Math.abs(frameLength("30000/1001") - 1001 / 30000) < 1e-12);
  assert.equal(syncLabel({ id: "k1" }, "k1"), "wyznacza czas");
  assert.equal(syncLabel({ id: "m1", sync: { confident: false } }, "k1"), "do sprawdzenia");
  assert.equal(syncLabel({ id: "m1", sync: { confident: true, manual: true } }, "k1"), "ustawione ręcznie");
  assert.equal(syncLabel({ id: "m1", sync: { confident: true, k: 2.4e-5 } }, "k1"), "pewna · dryf 24 ppm skorygowany");
  assert.equal(costLabel([{ costMicroUsd: 566 }, { costMicroUsd: 334 }]), "0,0009 USD");
  assert.equal(costLabel([{ costMicroUsd: 566 }, { costMicroUsd: null }]), "brak pełnych danych o koszcie");
  assert.equal(costLabel([]), null);
});

test("fala: maksimum w kolumnie, próg −60 dB", () => {
  const cols = waveColumns([-90, -60, -30, 0, -45, -45], 3);
  assert.deepEqual([...cols], [0, 1, 0.25]);
  assert.equal(waveColumns(null, 4).length, 4);
});
