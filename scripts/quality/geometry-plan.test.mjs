import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";
import { geometryInventory } from "../../src/quality/geometry-plan.mjs";
const source = await fs.readFile(
  new URL("../../src/reel-timing.ts", import.meta.url),
  "utf8",
);
const timing = await import(
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString("base64")}`
);
test("inventory follows actual caption schedule, cut words, hidden groups, emoji and Studio overrides", () => {
  const data = {
    source: "source.mp4",
    style: "happynews",
    fps: 10,
    segments: [{ start: 1, end: 2 }],
    captions: [
      { words: [{ text: "Trzmiel", start: 1.2, end: 1.5 }] },
      { hidden: true, words: [{ text: "Ukryty", start: 1.6, end: 1.9 }] },
      { words: [{ text: "Wycięty", start: 4, end: 4.2 }] },
    ],
    overlays: [
      { type: "title", text: "Hook", start: 1, end: 1.3 },
      { type: "emoji", label: "word", start: 1, end: 2 },
    ],
    studio: { c0: { from: 3, durationInFrames: 6 } },
    renderAssets: { decorations: [{ wordId: "c0w0", emoji: "🐝" }] },
  };
  const plan = geometryInventory(data, timing.captionClips(data), timing.toOut);
  assert.deepEqual(plan, [
    { id: "c0", role: "caption", from: 3, durationInFrames: 6 },
    { id: "c0w0", role: "emoji", from: 3, durationInFrames: 6 },
    { id: "o0", role: "hook", from: 0, durationInFrames: 3 },
  ]);
});
