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

test("full editing keeps hook instructions and its existing geometry contract", () => {
  const request = montageRequest(data, { preferences: {} }, "Popraw styl");
  assert.match(request.prompt, /POD napisami/);
  assert.match(request.prompt, /Hook Engineer i Silnik Social Media/);
  assert.match(request.prompt, /Zachowaj istniejący hook/);
  assert.ok(request.schema.properties.overlaysToAdd.items.properties.y);
  assert.ok(request.schema.properties.data);
});

test("word emoji prompt scopes automation to Happy News and rejects CJK", () => {
  const request = montageRequest(data, { styleId: "bisanz" }, "Popraw kolory");
  assert.match(request.prompt, /Wyłącznie dla Happy News/);
  assert.match(
    request.prompt,
    /Dla innych klientów nie dodawaj automatycznych emotek/,
  );
  assert.match(request.prompt, /ideogramów\/przycisków CJK/);
});

const compact = (changes = {}) => ({
  version: 2,
  summary: "Poprawiono",
  wordEdits: [],
  groups: null,
  ...changes,
});

test("compact word edits retain times and metadata without returning all captions", () => {
  const before = globalThis.structuredClone(data);
  before.captions[0].effect = "stamp";
  before.captions[0].end = 1.8;
  before.captions[0].words[0].confidence = 0.9;
  const out = applyEditResult(
    before,
    compact({
      wordEdits: [{ wordId: "w0", text: "Poprawione" }],
    }),
  ).data;
  assert.deepEqual(out.captions[0].words[0], {
    ...before.captions[0].words[0],
    text: "Poprawione",
  });
  assert.equal(out.captions[0].effect, "stamp");
  assert.equal(out.captions[0].end, 1.8);
  assert.deepEqual(out.framing, before.framing);
  assert.deepEqual(out.segments, before.segments);
  assert.equal(before.captions[0].words[0].text, "test");
});

test("compact grouping references every word once in source order", () => {
  const before = {
    ...data,
    captions: [
      {
        words: [
          { text: "Pierwsze", start: 0.1, end: 0.3 },
          { text: "drugie", start: 0.4, end: 0.6 },
        ],
        effect: "stamp",
        end: 1.8,
      },
    ],
  };
  const groups = [{ wordIds: ["w0", "w1"], keyWordId: "w1" }];
  const out = applyEditResult(before, compact({ groups })).data;
  assert.equal(out.captions[0].key, 1);
  assert.equal(out.captions[0].end, 1.8);
  for (const ids of [["w0"], ["w1", "w0"], ["w0", "w0"], ["w0", "w9"]])
    assert.throws(
      () =>
        applyEditResult(
          before,
          compact({
            groups: [{ wordIds: ids, keyWordId: null }],
          }),
        ),
      /słów|słowa|referencj|kolejność|napisów/,
    );
  assert.throws(
    () =>
      applyEditResult(
        before,
        compact({
          groups: [{ wordIds: ["w0", "w1"], keyWordId: "w9" }],
        }),
      ),
    /klucz|słowa|referencj/,
  );
});

test("compact correction rejects unknown and repeated references", () => {
  for (const edits of [
    [{ wordId: "w99", text: "obce" }],
    [
      { wordId: "w0", text: "a" },
      { wordId: "w0", text: "b" },
    ],
  ])
    assert.throws(
      () => applyEditResult(data, compact({ wordEdits: edits })),
      /słowa|referencj/,
    );
});

test("provider-neutral request is compact and excludes camera tracking and timestamp output", () => {
  const large = {
    ...data,
    framing: {
      ...data.framing,
      tracking: Array.from({ length: 2400 }, (_, i) => ({
        time: i / 1000,
        centerX: 0.123456789,
        centerY: 0.5,
      })),
    },
  };
  const request = montageRequest(
    large,
    { preferences: { client: "Zachowaj oprawę" } },
    "Popraw słowo",
    { scope: "captions" },
  );
  assert.equal(request.schema.properties.version.const, 2);
  assert.ok(request.schema.properties.wordEdits);
  assert.equal(request.schema.properties.data, undefined);
  assert.doesNotMatch(request.prompt, /0\.123456789|"tracking"|"source.mp4"/);
  assert.match(request.prompt, /Zachowaj oprawę/);
  assert.ok(request.prompt.length < JSON.stringify(large).length / 2);
});

test("v3 adapter binds limited text and hook operations to revision without camera context", () => {
  const request = montageRequest(data, {}, "Popraw napis", {scope: "operations", revision: 7, sourceIdentity: "reel-one"});
  assert.equal(request.schema.properties.version.const, 3);
  const context = JSON.parse(request.prompt.split("Kontekst operacji: ")[1]);
  assert.equal(context.baseRevision, 7);
  assert.equal(context.words[0].text, "test");
  assert.equal(context.framing, undefined);
  const result = {version:3,baseRevision:7,summary:"Poprawiono",operations:[{type:"replaceWordText",wordId:context.words[0].id,text:"Test!"}]};
  const applied = applyEditResult(data, result, {currentRevision:7,sourceIdentity:"reel-one",scope:"operations"});
  assert.equal(applied.data.captions[0].words[0].text,"Test!");
  assert.deepEqual(applied.data.segments,data.segments);
  assert.throws(()=>applyEditResult(data,result,{currentRevision:8,sourceIdentity:"reel-one",scope:"operations"}), /rewizję/);
  assert.throws(()=>applyEditResult(data,{...result,operations:[{type:"selectWordRange",firstWordId:context.words[0].id,lastWordId:context.words[0].id}]},{currentRevision:7,sourceIdentity:"reel-one",scope:"operations"}));
});
