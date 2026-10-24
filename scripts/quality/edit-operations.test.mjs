import test from "node:test";
import assert from "node:assert/strict";
import * as ops from "./edit-operations.mjs";
const before = {
  source: "source.mp4",
  style: "persona",
  fps: 30,
  segments: [{ start: 0, end: 3, zoom: 1 }],
  captions: [
    {
      words: [
        { id: "a", text: "Nie", start: 0, end: 0.5 },
        { id: "b", text: "usuwaj", start: 0.5, end: 1 },
        { id: "c", text: "tego", start: 1, end: 1.5 },
      ],
      key: 1,
    },
  ],
  overlays: [{ type: "title", start: 0, end: 3, text: "Hook" }],
};
const apply = (operations, extra = {}) =>
  ops.applyEditOperations({
    before,
    baseRevision: 2,
    currentRevision: 2,
    operations,
    contract: null,
    ...extra,
  });
test("revision-bound operations change only requested text and preserve times, hook and source", () => {
  const context = ops.editOperationContext(before, 2);
  const r = apply([
    { type: "replaceWordText", wordId: context.words[1].id, text: "zmieniaj" },
  ]);
  assert.equal(r.data.captions[0].words[1].text, "zmieniaj");
  assert.equal(r.data.captions[0].words[1].start, 0.5);
  assert.deepEqual(r.data.overlays, before.overlays);
  assert.deepEqual(r.data.segments, before.segments);
  assert.equal(before.captions[0].words[1].text, "usuwaj");
});
test("stale revision, unknown IDs and negation replacement are rejected before changes", () => {
  assert.throws(() => apply([], { baseRevision: 1 }), { status: 409 });
  assert.throws(
    () => apply([{ type: "replaceWordText", wordId: "foreign", text: "x" }]),
    /referenc/i,
  );
  const c = ops.editOperationContext(before, 2);
  assert.throws(
    () =>
      apply([{ type: "replaceWordText", wordId: c.words[0].id, text: "Tak" }]),
    /przeczen/i,
  );
  assert.throws(
    () =>
      apply([
        { type: "replaceWordText", wordId: c.words[1].id, text: "x" },
        { type: "replaceWordText", wordId: c.words[1].id, text: "y" },
      ]),
    /powtórz/i,
  );
});
test("hook replacement is explicit; selection cannot remove negation and SkyClass preserves speech", () => {
  const c = ops.editOperationContext(before, 2);
  assert.equal(
    apply([
      { type: "setHookText", overlayId: c.hooks[0].id, text: "Nowy hook" },
    ]).data.overlays[0].text,
    "Nowy hook",
  );
  assert.throws(
    () =>
      apply([
        {
          type: "selectWordRange",
          firstWordId: c.words[1].id,
          lastWordId: c.words[2].id,
        },
      ]),
    /przeczen/i,
  );
  const sky = { ...before, client: "skyclass" };
  const sc = ops.editOperationContext(sky, 2);
  assert.throws(
    () =>
      apply(
        [
          {
            type: "selectWordRange",
            firstWordId: sc.words[0].id,
            lastWordId: sc.words[2].id,
          },
        ],
        { before: sky },
      ),
    /SkyClass/,
  );
});

test("hook refs from another source at the same revision are rejected", () => {
  const a = ops.editOperationContext(before, 2, { sourceIdentity: "A" });
  assert.throws(
    () =>
      apply(
        [
          {
            type: "setHookText",
            overlayId: a.hooks[0].id,
            text: "Foreign hook",
          },
        ],
        { sourceIdentity: "B" },
      ),
    /referenc/i,
  );
});

test("numeric guards preserve decimal separators and signs", () => {
  for (const [text, replacement] of [
    ["1,5", "15"],
    ["-10", "10"],
    ["1.5", "15"],
  ]) {
    const numeric = {
      ...before,
      captions: [{ words: [{ text, start: 0, end: 1 }], key: 0 }],
    };
    const c = ops.editOperationContext(numeric, 2);
    assert.throws(
      () =>
        apply(
          [
            {
              type: "replaceWordText",
              wordId: c.words[0].id,
              text: replacement,
            },
          ],
          { before: numeric },
        ),
      /liczb/i,
    );
  }
});
