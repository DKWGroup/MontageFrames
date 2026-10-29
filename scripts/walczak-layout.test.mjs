import test from "node:test";
import assert from "node:assert/strict";
import {
  captionUnits,
  repairCaptionGroups,
  balanceCaptionLines,
  walczakFullRuns,
} from "../src/walczak-layout.mjs";
const words = (s) =>
  s.split(" ").map((text, start) => ({ text, start, end: start + 0.5 }));
test("Walczak keeps chained prepositions with their noun, including animation units", () => {
  assert.deepEqual(
    captionUnits(words("zadbać o i dla rodziny")).map((g) =>
      g.map((w) => w.text),
    ),
    [["zadbać"], ["o", "i", "dla", "rodziny"]],
  );
  const input = [words("Warto zadbać o i"), words("dla rodziny już dziś.")];
  const fixed = repairCaptionGroups(input);
  assert.deepEqual(
    fixed.map((g) => g.map((w) => w.text)),
    [
      ["Warto", "zadbać"],
      ["o", "i", "dla", "rodziny", "już", "dziś."],
    ],
  );
  assert.deepEqual(fixed.flat(), input.flat());
});
test("Walczak balances captions without splitting bound words or leaving a small singleton line", () => {
  const u = captionUnits(words("regularnie odkładasz na spokojną przyszłość"));
  const lines = balanceCaptionLines(u, [220, 220, 330, 250], 800, 15);
  assert.deepEqual(
    lines.map((g) => g.map((w) => w.text)),
    [
      ["regularnie", "odkładasz"],
      ["na", "spokojną", "przyszłość"],
    ],
  );
});
test("Walczak continuous backdrop bridges short gaps, excludes logo and separates real face returns", () => {
  const os = [
    { type: "media", side: "full", start: 1, end: 4 },
    { type: "process", side: "full", start: 4.05, end: 6 },
    { type: "logo", side: "full", start: 6, end: 8 },
    { type: "media", side: "full", start: 9, end: 11 },
  ];
  assert.deepEqual(walczakFullRuns(os), [
    { start: 1, end: 6 },
    { start: 9, end: 11 },
  ]);
  assert.equal(os[0].end, 4);
});
test("Walczak rebalances oversized groups and a final singleton as whole speech units", () => {
  const groups = [
    words("Możesz liczyć że jakoś to"),
    words("będzie albo możesz już dziś zbudować"),
    words("czy ma to sens w Twojej"),
    words("sytuacji."),
  ];
  const fixed = repairCaptionGroups(groups);
  assert.deepEqual(fixed.flat(), groups.flat());
  assert(fixed.every((g) => g.length >= 2 && g.length <= 6));
  assert(
    fixed.some((g) => g.map((w) => w.text).join(" ") === "w Twojej sytuacji."),
  );
  assert(!fixed.some((g) => g.at(-1).text === "już"));
});
