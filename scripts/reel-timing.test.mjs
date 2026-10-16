import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/reel-timing.ts", import.meta.url),
  "utf8",
);
const { captionClips, censorWord, muteGain, zoomThroughAt, reelDimensions, reelFrames, toOut, tokensFor } = await import(
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2018 } }).outputText).toString("base64")}`
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

test("hold: ostatnie słowo zostaje min. hold s, następna grupa wjeżdża później, bez kumulacji", () => {
  const fixture = {
    ...data,
    segments: [{ start: 0, end: 10 }],
    hold: 0.7,
    captions: [
      {
        words: [
          { text: "a", start: 0, end: 0.3 },
          { text: "b", start: 1, end: 1.2 },
        ],
      },
      {
        words: [
          { text: "c", start: 1.2, end: 1.5 },
          { text: "d", start: 3, end: 3.2 },
        ],
      },
      { words: [{ text: "e", start: 5, end: 5.5 }] },
    ],
  };
  assert.deepEqual(
    captionClips(fixture).map((c) => [c.from, c.durationInFrames]),
    [
      [0, 51], // 1 + 0,7 = 1,7 s
      [51, 75], // koniec: ostatnie słowo 3,2 + 1 s
      [150, 45],
    ],
  );
});

test("Bisanz retains final words instead of cutting off their entrance; other styles keep timing", () => {
  const fixture = {
    source: "source.mp4",
    style: "bisanz",
    fps: 30,
    segments: [{ start: 0, end: 5 }],
    captions: [
      {
        words: [
          { text: "To", start: 0, end: 0.2 },
          { text: "ważne", start: 0.8, end: 0.95 },
        ],
      },
      {
        words: [
          { text: "Następne", start: 1, end: 1.2 },
          { text: "zdanie", start: 1.8, end: 2 },
        ],
      },
    ],
  };
  assert.equal(captionClips(fixture)[0].durationInFrames, 38);
  assert.equal(
    captionClips({ ...fixture, style: "ameryka" })[0].durationInFrames,
    30,
  );
  assert.equal(captionClips({ ...fixture, hold: 0 })[0].durationInFrames, 30);
});

test("Bisanz fast groups last at least one second without delaying later pauses", () => {
  const fixture = {
    ...data,
    style: "bisanz",
    segments: [{ start: 0, end: 8 }],
    captions: [
      { words: [{ text: "Pierwsza", start: 0, end: 0.3 }] },
      { words: [{ text: "Druga", start: 0.7, end: 0.9 }] },
      { words: [{ text: "Po pauzie", start: 3, end: 3.4 }] },
    ],
  };
  const clips = captionClips(fixture);
  assert.equal(clips[0].durationInFrames, 30);
  assert.ok(clips[1].durationInFrames >= 30);
  assert.equal(clips[2].start, 3);
});

test("rapid Bisanz sentence groups never disappear beyond the end of the video", () => {
  const fixture = {
    source: "a.mp4",
    style: "bisanz",
    fps: 30,
    segments: [{ start: 0, end: 1.2 }],
    captions: [0, 0.4, 0.8].map((start) => ({
      words: [{ text: "Tak.", start, end: start + 0.3 }],
    })),
  };
  const clips = captionClips(fixture);
  assert.equal(clips.length, 3);
  assert.ok(
    clips.every(
      (c) => c.durationInFrames > 0 && c.start - c.words[0].start <= 0.351,
    ),
  );
  assert.equal(clips.at(-1).from + clips.at(-1).durationInFrames, 36);
});

test("Bisanz tail groups retain distinct frames when speech accelerates near the end", () => {
  const fixture = {
    source: "a.mp4",
    style: "bisanz",
    fps: 30,
    segments: [{ start: 0, end: 1.2 }],
    captions: [0.8, 0.9, 1].map((start) => ({
      words: [{ text: "Tak.", start, end: start + 0.08 }],
    })),
  };
  const clips = captionClips(fixture);
  assert.equal(clips.length, 3);
  assert.ok(clips.every((c) => c.durationInFrames > 0));
});

test("brak format = pion 1080x1920", () => {
  assert.deepEqual(reelDimensions({}), { width: 1080, height: 1920 });
});
test("format 16:9", () => {
  assert.deepEqual(reelDimensions({ format: { width: 1920, height: 1080 } }), { width: 1920, height: 1080 });
});
test("odrzuca nieparzyste i zerowe wymiary", () => {
  assert.throws(() => reelDimensions({ format: { width: 1919, height: 1080 } }));
  assert.throws(() => reelDimensions({ format: { width: 0, height: 1080 } }));
});

test("tokensFor: poziomy kadr i styl z T16 -> T16", () => {
  const style = { T: { y: 0.7 }, T16: { y: 0.8 } };
  assert.deepEqual(tokensFor(style, { width: 1920, height: 1080 }), { y: 0.8 });
  assert.deepEqual(tokensFor(style, { width: 1080, height: 1920 }), { y: 0.7 });
});
test("tokensFor: poziomy kadr bez T16 -> T + missing16x9", () => {
  assert.deepEqual(tokensFor({ T: { y: 0.7 } }, { width: 1920, height: 1080 }), { y: 0.7, missing16x9: true });
});

test("muteGain: zero w wyciszeniu, rampa na brzegach, 1 poza nim", () => {
  const mutes = [{ start: 10, end: 10.5, ramp: 0.01 }];
  assert.equal(muteGain(9, mutes), 1);
  assert.equal(muteGain(10.2, mutes), 0);
  assert.ok(Math.abs(muteGain(9.995, mutes) - 0.5) < 1e-6);
  assert.ok(Math.abs(muteGain(10.505, mutes) - 0.5) < 1e-6);
  assert.equal(muteGain(11, undefined), 1);
});
test("censorWord: pierwsza i ostatnia litera, interpunkcja zostaje", () => {
  assert.equal(censorWord("kurwa"), "k***a");
  assert.equal(censorWord("Kurwa!"), "K***a!");
  assert.equal(censorWord("jeb..."), "j***...");
});

test("zoomThroughAt: najazd do granicy, wyjście już w nowej scenie, poza oknem bez zmian", () => {
  const w = [{ start: 10 }];
  assert.deepEqual(zoomThroughAt(5, w), { scale: 1, blur: 0 });
  assert.deepEqual(zoomThroughAt(10, w), { scale: 1.5, blur: 8 });
  assert.equal(zoomThroughAt(9.7, w).scale, 1);
  assert.equal(zoomThroughAt(10.3, w).scale, 1);
  assert.ok(zoomThroughAt(9.85, w).scale > 1 && zoomThroughAt(10.15, w).scale > 1);
});
