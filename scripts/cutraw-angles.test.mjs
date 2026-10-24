import assert from "node:assert/strict";
import { test } from "node:test";
import { cameraPlan, defaultAngles } from "./cutraw-angles.mjs";

test("domyślne kąty: więcej kamer niż mikrofonów → plan ogólny na kamerze głównej, jedna kamera → bez przełączania", () => {
  assert.deepEqual(defaultAngles(["k1", "k2", "k3"], ["m1", "m2"]), { k1: "wide", k2: "m1", k3: "m2" });
  assert.deepEqual(defaultAngles(["k1", "k2"], ["m1", "m2"]), { k1: "m1", k2: "m2" });
  assert.deepEqual(defaultAngles(["k1"], ["m1", "m2"]), { k1: null });
  assert.deepEqual(defaultAngles(["k1", "k2"], []), { k1: null, k2: null });
});

// Słowa co 0,4 s od a do b (czas mastera).
const talk = (speaker, a, b) => Array.from({ length: Math.round((b - a) / 0.4) }, (_, i) => ({ speaker, start: a + i * 0.4, end: a + i * 0.4 + 0.35 }));

test("plan: kamera na mówiącym, „mhm” i krótka odpowiedź nie przełączają, nakładanie = plan ogólny, zmiana na cięciu", () => {
  const words = [
    ...talk("Ania", 0.5, 9.8),
    ...talk("Bartek", 12.2, 16),
    { speaker: "Ania", start: 13, end: 13.2 }, // „mhm” w trakcie Bartka
    ...talk("Ania", 16.3, 17), // krótka wtrącona odpowiedź < 2,5 s
    ...talk("Bartek", 17.2, 22),
    ...talk("Ania", 22.5, 25),
    ...talk("Bartek", 22.5, 25),
    ...talk("Ania", 25.2, 30),
  ].sort((a, b) => a.start - b.start);
  const shots = cameraPlan({
    words,
    segments: [{ start: 0, end: 10 }, { start: 12, end: 30 }],
    cameras: [{ id: "ogolny", shows: "wide" }, { id: "ania", shows: "Ania" }, { id: "bartek", shows: "Bartek" }],
    duration: 30,
  });
  assert.deepEqual(shots.map((s) => s.camera), ["ania", "bartek", "ogolny", "ania"]);
  assert.deepEqual([shots[0].start, shots.at(-1).end], [0, 30]);
  assert.equal(shots[1].start, 12, "zmiana na Bartka dokładnie na cięciu 10 → 12 s");
  assert.ok(Math.abs(shots[2].start - 22.2) < 0.15 && Math.abs(shots[3].start - 24.9) < 0.15, JSON.stringify(shots));
  shots.slice(1).forEach((s, i) => assert.equal(s.start, shots[i].end));
});

test("plan: bez przypisanych kamer albo z jedną kamerą — brak przełączania; nikt nie mówi — zostaje plan ogólny", () => {
  const base = { words: talk("Ania", 0, 5), segments: [{ start: 0, end: 5 }], duration: 5 };
  assert.equal(cameraPlan({ ...base, cameras: [{ id: "k1", shows: "Ania" }] }), null);
  assert.equal(cameraPlan({ ...base, cameras: [{ id: "k1", shows: "wide" }, { id: "k2", shows: null }] }), null);
  assert.deepEqual(cameraPlan({ ...base, words: [], cameras: [{ id: "k1", shows: "wide" }, { id: "k2", shows: "Ania" }] }), [{ camera: "k1", start: 0, end: 5 }]);
});
