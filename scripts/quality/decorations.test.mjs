import test from "node:test";
import assert from "node:assert/strict";
import * as decorations from "../../src/caption-decoration.mjs";
const data = {
  style: "happynews",
  captions: [
    {
      words: [
        { text: "trzmiele", start: 1, end: 2 },
        { text: "śpią", start: 2, end: 3 },
      ],
    },
  ],
  overlays: [],
};
test("one frozen decoration stays attached to the exact source word and keeps text untouched", () => {
  assert.equal(typeof decorations.freezeCaptionDecorations, "function");
  const before = JSON.stringify(data);
  const frozen = decorations.freezeCaptionDecorations(data);
  assert.equal(frozen[0].wordId, "c0w0");
  assert.equal(frozen[0].emoji, "🐝");
  assert.equal(JSON.stringify(data), before);
});
test("conflicting double decoration and a remote emoji image cannot become a frozen render", () => {
  const overlays = [
    { type: "emoji", label: "word", start: 1, emoji: "🐝" },
    { type: "emoji", label: "word", start: 1, emoji: "🌸" },
  ];
  assert.throws(
    () => decorations.freezeCaptionDecorations({ ...data, overlays }),
    /emot|dekorac/i,
  );
  assert.throws(
    () =>
      decorations.freezeCaptionDecorations({
        ...data,
        overlays: [{ ...overlays[0], src: "https://example.com/a.png" }],
      }),
    /ścież|plik/i,
  );
});
