import test from "node:test";
import assert from "node:assert/strict";
import { applyEditResult, montageRequest } from "./quickcontent-edit.mjs";
const data = {
  source: "source.mp4",
  style: "persona",
  fps: 30,
  framing: { mode: "crop", centerX: 0.8, centerY: 0.5 },
  segments: [{ start: 0, end: 2 }],
  captions: [{ words: [{ text: "test", start: 0.1, end: 0.5 }] }],
  overlays: [],
};
test("null montage becomes an actionable error before any file update", () => {
  assert.throws(
    () => applyEditResult(data, { data: null, summary: "cannot edit" }),
    /nie zwrócił poprawnego montażu/,
  );
  assert.equal(data.source, "source.mp4");
});
test("structured editorial changes retain source, crop and immutable metadata", () => {
  const out = applyEditResult(data, {
    summary: "Poprawiono",
    data: {
      captions: [
        {
          words: [{ text: "Test!", start: 0.1, end: 0.5 }],
          key: 0,
          layout: null,
          from: null,
          align: null,
          hl: null,
          y: null,
        },
      ],
      segments: null,
    },
    overlaysToAdd: [],
    overlaysToRemove: [],
  });
  assert.equal(out.data.source, data.source);
  assert.deepEqual(out.data.framing, data.framing);
  assert.equal(out.data.captions[0].words[0].text, "Test!");
  assert.equal(out.data.captions[0].words[0].start, 0.1);
  assert.equal(out.data.captions[0].layout, undefined);
  const request = montageRequest(
    data,
    { preferences: { general: "Brand rules" } },
    null,
  );
  assert.equal(request.schema.properties.data.type, "object");
  assert.doesNotMatch(
    request.prompt,
    /Przeczytaj PREFERENCJE|npx remotion|npm run/,
  );
});

test("text correction keeps SkyClass stamp, color and explicit caption end", () => {
  const before = {
    ...data,
    style: "skyclass",
    captions: [
      {
        words: data.captions[0].words,
        effect: "stamp",
        end: 1.9,
        color: "#FF395C",
        y: 0.63,
      },
    ],
  };
  const r = applyEditResult(before, {
    summary: "Literówka",
    data: {
      captions: [
        {
          words: [{ text: "Test!", start: 0.1, end: 0.5 }],
          key: null,
          layout: null,
          from: null,
          align: null,
          hl: null,
          y: null,
        },
      ],
      segments: null,
    },
    overlaysToAdd: [],
    overlaysToRemove: [],
  });
  assert.equal(r.data.captions[0].effect, "stamp");
  assert.equal(r.data.captions[0].end, 1.9);
  assert.equal(r.data.captions[0].color, "#FF395C");
  assert.equal(r.data.captions[0].y, 0.63);
});

test("hook brief places opening below captions and API schema exposes coordinates", () => {
  const request = montageRequest(data, { preferences: {} }, "Popraw styl");
  assert.match(request.prompt, /POD napisami/);
  assert.match(request.prompt, /Hook Engineer i Silnik Social Media/);
  assert.match(request.prompt, /Zachowaj istniejący hook/);
  assert.ok(request.schema.properties.overlaysToAdd.items.properties.y);
  assert.ok(
    request.schema.properties.data.properties.captions.anyOf.find(
      (x) => x.type === "array",
    ).items.properties.y,
  );
});

test("word emoji prompt scopes automation to Happy News and rejects CJK", () => {
  const request = montageRequest(data, {styleId: "bisanz"}, "Popraw kolory");
  assert.match(request.prompt, /Wyłącznie dla Happy News/);
  assert.match(request.prompt, /Dla innych klientów nie dodawaj automatycznych emotek/);
  assert.match(request.prompt, /ideogramów\/przycisków CJK/);
});
