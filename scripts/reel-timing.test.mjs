import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/reel-timing.ts", import.meta.url),
  "utf8",
);
const { captionClips, reelFrames, toOut } = await import(
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString("base64")}`
);

const data = {
  source: "source.mp4",
  style: "persona",
  fps: 30,
  segments: [
    { start: 1, end: 3 },
    { start: 5, end: 7 },
  ],
  captions: [
    { words: [{ text: "Początek", start: 1, end: 1.5 }] },
    { words: [{ text: "Wycięte", start: 4, end: 4.5 }] },
    { words: [{ text: "Koniec", start: 6.5, end: 7 }] },
  ],
};

test("napis na końcu nie wystaje poza rolkę na osi czasu", () => {
  const clips = captionClips(data);
  assert.equal(clips.at(-1).from + clips.at(-1).durationInFrames, 120);
  assert.equal(reelFrames(data), 120);
});

test("napisy z wyciętych fragmentów znikają, pozostałe zachowują indeks do edycji", () => {
  assert.deepEqual(
    captionClips(data).map((c) => c.index),
    [0, 2],
  );
  assert.equal(toOut(6.5, data.segments), 3.5);
});

test("jawny koniec i początek następnej grupy ograniczają czas napisów", () => {
  const fixture = {
    ...data,
    segments: [{ start: 0, end: 5 }],
    captions: [
      { words: [{ text: "Pierwszy", start: 0, end: 1 }], end: 0.5 },
      { words: [{ text: "Drugi", start: 1, end: 2 }] },
      { words: [{ text: "Trzeci", start: 2.5, end: 3 }] },
    ],
  };
  assert.deepEqual(
    captionClips(fixture).map((c) => [c.from, c.durationInFrames]),
    [
      [0, 15],
      [30, 45],
      [75, 45],
    ],
  );
});
