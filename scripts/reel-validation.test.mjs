import test from "node:test";
import assert from "node:assert/strict";
import { validateReelEdit } from "./reel-validation.mjs";

const reel = () => ({
  source: "source.mp4",
  style: "persona",
  fps: 30,
  segments: [{ start: 0, end: 2 }],
  captions: [
    {
      words: [
        { text: "Pierwsze", start: 0.1, end: 0.4 },
        { text: "drugie", start: 1.2, end: 1.8 },
      ],
      key: 1,
    },
  ],
  overlays: [],
});

test("captions in trimmed-away ranges remain editable without changing their original times", () => {
  const before = reel();
  before.segments = [{ start: 0, end: 1 }];
  const after = globalThis.structuredClone(before);
  after.captions[0].words[1].text = "Drugie!";
  assert.doesNotThrow(() => validateReelEdit(before, after));
});

test("self-check rejects invalid frame rates and malformed nested data as validation errors", () => {
  for (const fps of [0, -30, "30", Number.POSITIVE_INFINITY]) {
    const bad = { ...reel(), fps };
    assert.throws(() => validateReelEdit(bad, bad), { status: 400 });
  }
});

test("all native client profiles accept text corrections without changing their style", () => {
  for (const style of [
    "persona",
    "skyclass",
    "herod",
    "bisanz",
    "ameryka",
    "glowup",
    "vital",
    "happynews",
  ]) {
    const before = { ...reel(), style };
    const after = globalThis.structuredClone(before);
    after.captions[0].words[0].text = "Poprawione";
    assert.doesNotThrow(() => validateReelEdit(before, after));
  }
});

test("custom brand snapshot is protected while an unbranded style remains manually editable", () => {
  const before = reel(),
    after = { ...before, style: "herod" };
  assert.throws(() => validateReelEdit(before, after), { status: 400 });
  assert.doesNotThrow(() =>
    validateReelEdit(before, after, { lockStyle: false }),
  );
  const custom = {
    ...before,
    style: "brand",
    branding: { revision: 3, captions: { size: 74 } },
  };
  assert.throws(
    () => validateReelEdit(custom, { ...custom, branding: { revision: 4 } }),
    { status: 400 },
  );
});

test("edits reject repeated words, reordering, overlaps and asset traversal", () => {
  const before = reel();
  const variants = [
    { ...before, captions: [...before.captions, ...before.captions] },
    {
      ...before,
      captions: [{ words: [...before.captions[0].words].reverse() }],
    },
    {
      ...before,
      segments: [
        { start: 0, end: 1.5 },
        { start: 1, end: 2 },
      ],
    },
    {
      ...before,
      overlays: [{ type: "media", src: "../private.mp4", start: 0, end: 1 }],
    },
  ];
  for (const after of variants)
    assert.throws(() => validateReelEdit(before, after), { status: 400 });
});

test("old Bisanz zoom metadata does not block text edits while new zoom is rejected", () => {
  const before = {
    ...reel(),
    style: "bisanz",
    segments: [{ start: 0, end: 2, zoom: 1.1 }],
  };
  const after = globalThis.structuredClone(before);
  after.captions[0].words[0].text = "Poprawione";
  assert.doesNotThrow(() => validateReelEdit(before, after));
  after.segments[0].zoom = 1.2;
  assert.throws(() => validateReelEdit(before, after), { status: 400 });
  after.segments[0].zoom = 1;
  assert.doesNotThrow(() => validateReelEdit(before, after));
});
