import test from "node:test";
import assert from "node:assert/strict";
import { planRecompute } from "./dependencies.mjs";
const before = {
  source: "source.mp4",
  style: "persona",
  segments: [{ start: 0, end: 3, zoom: 1 }],
  captions: [
    {
      words: [
        { text: "Nie", start: 0, end: 0.5 },
        { text: "usuwaj", start: 0.5, end: 1 },
        { text: "tego", start: 1, end: 1.5 },
      ],
      key: 1,
    },
  ],
  overlays: [{ type: "title", start: 0, end: 3, text: "Hook" }],
};
test("manual appearance and resolution changes need no AI or ASR; text invalidates only content dependents", () => {
  assert.deepEqual(
    planRecompute(before, { ...before, outputResolution: 720 }),
    ["geometry", "render"],
  );
  const changed = globalThis.structuredClone(before);
  changed.captions[0].words[1].text = "zmieniaj";
  assert.deepEqual(planRecompute(before, changed), [
    "geometry",
    "render",
    "publication",
  ]);
  const zoom = globalThis.structuredClone(before);
  zoom.segments[0].zoom = 1.1;
  assert.deepEqual(planRecompute(before, zoom), ["geometry", "render"]);
  assert.deepEqual(planRecompute(before, before), []);
});
