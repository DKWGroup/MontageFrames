import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHappyLayouts,
  layoutAt,
  cropForFace,
} from "../src/quickcontent/layout.mjs";
import { emojiForWord, titleHighlight } from "../src/caption-decoration.mjs";
const left = { x: 0.12, y: 0.18, width: 0.12, height: 0.25, mouth: 0.02 };
const right = { ...left, x: 0.7 };
const media = { x: 0.38, y: 0.01, width: 0.24, height: 0.4 };
const samples = Array.from({ length: 8 }, (_, i) => [
  { ...left, mouth: i % 2 ? 0.12 : 0.02 },
  { ...right, mouth: i % 2 ? 0.02 : 0.12 },
]);
test("two moving mouths show both current faces; embedded topic image uses lower 40 percent", () => {
  const f = buildHappyLayouts({
    samples,
    panels: samples.map(() => [media]),
    fps: 4,
    duration: 2,
    cuts: [],
    speech: [[0, 2]],
  });
  assert.equal(layoutAt({ layouts: f }, 0.8).kind, "duo-media");
  assert.equal(f[0].people.length, 2);
  assert.deepEqual(f[0].media, media);
  const duo = buildHappyLayouts({
    samples,
    panels: [],
    fps: 4,
    duration: 2,
    cuts: [],
    speech: [[0, 2]],
  });
  assert.equal(layoutAt({ layouts: duo }, 0.8).kind, "duo");
  assert.equal(layoutAt({ layouts: duo, trackingEnabled: false }, 0.8), null);
});
test("single-host closeups never extract the background screen; footage without hosts invents no reaction", () => {
  const f = buildHappyLayouts({
    samples: samples.map((s) => s.slice(0, 1)),
    panels: samples.map(() => [media]),
    fps: 4,
    duration: 2,
  });
  assert.equal(f[0].kind, "speaker");
  assert.equal(f[0].media, undefined);
  assert.deepEqual(
    buildHappyLayouts({
      samples: [[], []],
      panels: [[media], [media]],
      fps: 4,
      duration: 0.5,
    }),
    [],
  );
  const crop = cropForFace(left, 9 / 8, 16 / 9);
  assert.ok(crop.x <= left.x && crop.x + crop.width >= left.x + left.width);
  assert.ok(crop.y <= left.y && crop.y + crop.height >= left.y + left.height);
});
test("decorations match spoken meaning; hex colour is never printed as hook text", () => {
  assert.equal(emojiForWord("trzmiele,"), "🐝");
  assert.equal(emojiForWord("skuterem"), "🛵");
  assert.equal(emojiForWord("skuteczny"), null);
  assert.equal(titleHighlight("Dlaczego kupują firmy?", "#FF3D8B"), null);
  assert.equal(titleHighlight("Dlaczego kupują firmy?", "firmy"), "firmy");
  assert.equal(titleHighlight("Dlaczego kupują firmy?", "zielony"), null);
});

test("layout validation rejects out of bounds panes and tracking jumps across camera cuts", async () => {
  const { validTracking } = await import("../src/quickcontent/framing.mjs");
  const f = buildHappyLayouts({
    samples,
    panels: samples.map(() => [media]),
    fps: 4,
    duration: 2,
  });
  assert.ok(validTracking({ sourceAspect: 16 / 9, layouts: f }, 2));
  assert.equal(
    validTracking(
      {
        sourceAspect: 16 / 9,
        layouts: [{ ...f[0], media: { ...media, x: 0.95 } }],
      },
      2,
    ),
    false,
  );
  const a = { ...f[0], start: 0, end: 1, people: [left, right] },
    b = {
      ...f[0],
      start: 1,
      end: 2,
      cut: true,
      people: [{ ...left, x: 0.5 }, right],
    };
  assert.equal(layoutAt({ layouts: [a, b] }, 0.9).people[0].x, 0.12);
});

test("a one-frame rectangle is ignored and a one-frame detector miss never flashes out of a confirmed panel", () => {
  const singleton = buildHappyLayouts({
    samples: samples.map((s) => s.slice(0, 1)),
    panels: samples.map((_, i) => (i === 3 ? [media] : [])),
    fps: 4,
    duration: 2,
  });
  assert.ok(singleton.every((l) => l.kind === "speaker"));
  const filled = buildHappyLayouts({
    samples,
    panels: samples.map((_, i) => (i === 3 ? [] : [media])),
    fps: 4,
    duration: 2,
  });
  assert.ok(layoutAt({ layouts: filled }, 0.8));
});

test("an editorial emoji anchors to an exact spoken word without modifying its text", async () => {
  const { emojiForCaptionWord } = await import("../src/caption-decoration.mjs");
  const word = { text: "mikroskop", start: 3 };
  assert.equal(
    emojiForCaptionWord(word, [
      { type: "emoji", label: "word", start: 3, emoji: "🧪" },
    ]),
    "🧪",
  );
  assert.equal(
    emojiForCaptionWord(word, [
      { type: "emoji", label: "word", start: 9, emoji: "🧪" },
    ]),
    "🔬",
  );
  assert.equal(word.text, "mikroskop");
});

test("two-host reaction layout holds briefly through a pause without crossing camera cuts", () => {
  const speechSamples = Array.from({ length: 20 }, (_, i) => [
    { ...left, mouth: i < 5 && i % 2 ? 0.12 : 0.02 },
    { ...right, mouth: i < 5 && i % 2 ? 0.12 : 0.02 },
  ]);
  const f = buildHappyLayouts({
    samples: speechSamples,
    fps: 4,
    duration: 5,
    speech: [[0, 5]],
    cuts: [3],
  });
  assert.equal(layoutAt({ layouts: f }, 2)?.kind, "duo");
  assert.equal(layoutAt({ layouts: f }, 3.2)?.kind, "duo");
});

test("wide shot layout survives mouth pauses and short face/panel misses", () => {
  const f = buildHappyLayouts({
    samples: samples.map((s, i) =>
      i === 3 ? s.slice(0, 1) : s.map((face) => ({ ...face, mouth: 0.02 })),
    ),
    panels: samples.map((_, i) => (i === 3 ? [] : [media])),
    fps: 4,
    duration: 2,
    cuts: [],
  });
  assert.ok(f.every((l) => l.kind === "duo-media"));
  const plain = buildHappyLayouts({
    samples: samples.map((s) => s.map((f) => ({ ...f, mouth: 0.02 }))),
    fps: 4,
    duration: 2,
  });
  assert.ok(plain.every((l) => l.kind === "duo"));
});
test("face crops centre the face, leave more room, and raise the lower host", () => {
  const face = { x: 0.4, y: 0.4, width: 0.1, height: 0.15 };
  const crop = cropForFace(face, 9 / 8, 16 / 9);
  assert.ok(crop.height >= 0.65);
  assert.ok(
    Math.abs((face.x + face.width / 2 - crop.x) / crop.width - 0.5) < 0.001,
  );
  assert.ok(
    Math.abs((face.y + face.height / 2 - crop.y) / crop.height - 0.48) < 0.001,
  );
  const lower = cropForFace(face, 9 / 8, 16 / 9, 0.4);
  assert.ok(
    Math.abs((face.y + face.height / 2 - lower.y) / lower.height - 0.4) < 0.001,
  );
});

test("word emoji never attaches to a preceding word only 50ms away", async () => {
  const { emojiForCaptionWord } = await import("../src/caption-decoration.mjs");
  const overlays = [
    { type: "emoji", label: "word", emoji: "🏭", start: 12.07 },
  ];
  assert.equal(
    emojiForCaptionWord({ text: "że", start: 12.02 }, overlays),
    null,
  );
  assert.equal(
    emojiForCaptionWord({ text: "zakłady", start: 12.07 }, overlays),
    "🏭",
  );
});

test("single-host caption positions override old face-level values; approved duo captions stay put", async () => {
  const { happyCaptionY, happyHookY } =
    await import("../src/quickcontent/layout.mjs");
  assert.equal(happyCaptionY("speaker", 0.53), 0.65);
  assert.equal(happyCaptionY("duo", 0.53), 0.535);
  assert.equal(happyCaptionY("duo-media", 0.53), 0.565);
  assert.equal(happyHookY("speaker", 0.69), 0.735);
});
test("country mentions receive matching flags including inflected Polish names", async () => {
  const { emojiForCaptionWord } = await import("../src/caption-decoration.mjs");
  for (const [word, flag] of [
    ["Polskę", "🇵🇱"],
    ["Polski", "🇵🇱"],
    ["niemiecki", "🇩🇪"],
    ["Niemczech", "🇩🇪"],
    ["Francji", "🇫🇷"],
    ["Włochy", "🇮🇹"],
    ["Japonii", "🇯🇵"],
  ])
    assert.equal(emojiForWord(word), flag);
  assert.equal(emojiForWord("franczyza"), null);
  assert.equal(
    emojiForCaptionWord({ text: "kraj", start: 2 }, [
      { type: "emoji", label: "word", start: 2, emoji: "🇵🇱" },
    ]),
    "🇵🇱",
  );
});

test("speaker viewport never moves or zooms; small head jitter is ignored and pan is bounded", async () => {
  const { speakerWindowAt } = await import("../src/quickcontent/layout.mjs");
  const make = (x, i, cut = false) => ({
    start: i * 0.25,
    end: (i + 1) * 0.25,
    kind: "speaker",
    people: [{ x, y: 0.3, width: 0.15, height: 0.3 }],
    cut,
  });
  const framing = {
    sourceAspect: 16 / 9,
    layouts: [
      make(0.3, 0),
      make(0.305, 1),
      make(0.295, 2),
      make(0.5, 3),
      make(0.5, 4),
      make(0.7, 5, true),
    ],
  };
  const a = speakerWindowAt(framing, 0),
    b = speakerWindowAt(framing, 0.5),
    c = speakerWindowAt(framing, 0.99),
    d = speakerWindowAt(framing, 1.25);
  assert.equal(a.videoLeft, b.videoLeft);
  for (const p of [b, c, d])
    for (const k of [
      "left",
      "top",
      "width",
      "height",
      "videoWidth",
      "videoHeight",
    ])
      assert.equal(p[k], a[k]);
  assert.ok(Math.abs(c.videoLeft - b.videoLeft) <= a.videoWidth * 0.025 * 0.5);
  assert.ok(d.videoLeft < c.videoLeft - 100);
  for (const p of [a, b, c, d]) {
    assert.ok(p.videoTop <= 0 && p.videoTop >= p.height - p.videoHeight);
    assert.ok(p.videoLeft <= 0 && p.videoLeft >= p.width - p.videoWidth);
  }
});

test("automatic emoji coverage extends beyond manual examples, declines fillers and limits clutter", async () => {
  const { captionEmojis } = await import("../src/caption-decoration.mjs");
  for (const word of [
    "zasypiają",
    "kwiatku",
    "domu",
    "kupiła",
    "firmy",
    "cisza",
    "zdjęcia",
    "jabłko",
    "gitara",
  ])
    assert.ok(emojiForWord(word), word);
  for (const word of ["wiesz", "jakoś", "bardzo", "regularny"])
    assert.equal(emojiForWord(word), null, word);
  const words = ["firmy", "kupiła", "telefon", "telefon"].map(
    (text, start) => ({ text, start }),
  );
  assert.equal(captionEmojis(words).filter(Boolean).length, 2);
  assert.equal(
    captionEmojis(
      ["polska", "firma", "kupiła"].map((text, start) => ({ text, start })),
    ).filter(Boolean).length,
    2,
  );
  const flags = ["Polski", "Niemiec", "Francji"].map((text, start) => ({
    text,
    start,
  }));
  assert.equal(captionEmojis(flags).filter(Boolean).length, 3);
});

test("split-screen face scale stays constant through head turns and resets at camera cuts", async () => {
  const { steadyFaceRect } = await import("../src/quickcontent/layout.mjs");
  const entries = [0.14, 0.22, 0.16, 0.3].map((height, i) => ({
    start: i,
    end: i + 1,
    kind: "duo",
    people: [{ x: 0.2, y: 0.3, width: 0.1, height }, right],
    cut: i === 3,
  }));
  const f = { layouts: entries };
  assert.equal(
    steadyFaceRect(f, entries[0], 0).height,
    steadyFaceRect(f, entries[2], 0).height,
  );
  assert.equal(steadyFaceRect(f, entries[3], 0).height, 0.3);
});

test("the first stale detection after a camera cut cannot drag the new speaker off screen", async () => {
  const { speakerWindowAt } = await import("../src/quickcontent/layout.mjs");
  const layouts = [0.35, 0.53, 0.53, 0.53, 0.53].map((x, i) => ({
    start: i * 0.25,
    end: (i + 1) * 0.25,
    kind: "speaker",
    people: [{ x, y: 0.3, width: 0.16, height: 0.3 }],
    cut: i === 0,
  }));
  const w = speakerWindowAt({ sourceAspect: 16 / 9, layouts }, 0.75);
  const faceX = w.videoLeft + 0.61 * w.videoWidth;
  assert.ok(Math.abs(faceX - 540) < 50);
});

test("local topic photos remain valid in lower panels and cannot escape the reel directory", async () => {
  const { validLayouts } = await import("../src/quickcontent/layout.mjs");
  const l = {
    start: 40,
    end: 44,
    kind: "speaker-media",
    people: [left],
    media,
    mediaSrc: "bee-topic-1.png",
  };
  assert.ok(validLayouts({ sourceAspect: 16 / 9, layouts: [l] }, 57.33));
  assert.equal(
    validLayouts(
      { sourceAspect: 16 / 9, layouts: [{ ...l, mediaSrc: "../secret.png" }] },
      57.33,
    ),
    false,
  );
});

test("emoji decoration rejects CJK buttons and fuzzy stem matches", async () => {
  const { emojiForCaptionWord } = await import("../src/caption-decoration.mjs");
  for (const text of ["bezpłatny", "rezerwacja", "akceptowalny"])
    assert.equal(emojiForCaptionWord({text, start: 1}, [
      {type: "emoji", label: "word", start: 1, emoji: "🈯"},
    ]), emojiForWord(text));
  assert.equal(emojiForWord("bezpłatny"), null);
});
