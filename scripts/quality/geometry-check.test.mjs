import test from "node:test";
import assert from "node:assert/strict";
import * as qc from "./geometry-check.mjs";
const data = {
  source: "source.mp4",
  style: "persona",
  segments: [{ start: 0, end: 2 }],
  captions: [],
  framing: {
    mode: "crop",
    centerX: 0.5,
    centerY: 0.5,
    cameraCuts: [1],
    tracking: [
      { time: 0, centerX: 0.2, centerY: 0.5, shotId: "a" },
      { time: 1, centerX: 0.8, centerY: 0.5, shotId: "b", cut: true },
      { time: 2, centerX: 0.8, centerY: 0.5, shotId: "b" },
    ],
  },
};
const manifest = {
  signature: "revision-one",
  inputs: { data, expectedFrames: 2 },
  output: { width: 1080, height: 1920, fps: 30 },
};
test("geometry reports missing animation bounds as unknown, never as accepted visuals", () => {
  const r = qc.checkGeometry({ manifest });
  assert.equal(r.status, "unknown");
  assert.equal(r.manifestSignature, "revision-one");
  assert.ok(
    r.findings.some(
      (f) => f.ruleId === "animation.bounds" && f.status === "unknown",
    ),
  );
});
test("geometry rejects camera interpolation through an exact cut", () => {
  const d = globalThis.structuredClone(data);
  d.framing.tracking.splice(1, 1);
  const r = qc.checkGeometry({
    manifest: { ...manifest, inputs: { data: d } },
  });
  assert.equal(r.status, "fail");
  assert.ok(
    r.findings.some(
      (f) => f.ruleId === "tracking.cut-boundary" && f.frameRange[0] === 28,
    ),
  );
});
test("measured text must fit safezone and avoid face; partial samples do not certify a whole animation", () => {
  const frameBounds = {
    manifestSignature: "revision-one",
    space: "output-normalized",
    frames: [
      {
        frame: 0,
        boxes: [
          {
            id: "word",
            role: "caption",
            x: 0.8,
            y: 0.7,
            width: 0.15,
            height: 0.12,
          },
          { id: "face", role: "face", x: 0.8, y: 0.7, width: 0.1, height: 0.1 },
        ],
      },
    ],
  };
  const r = qc.checkGeometry({ manifest, frameBounds });
  assert.equal(r.status, "fail");
  assert.ok(r.findings.some((f) => f.ruleId === "text.safezone"));
  assert.ok(r.findings.some((f) => f.ruleId === "text.face-overlap"));
  assert.ok(
    r.findings.some(
      (f) => f.ruleId === "animation.bounds" && f.status === "unknown",
    ),
  );
});

test("empty boxes and empty detector samples cannot certify an existing caption", () => {
  const d = {
    ...data,
    captions: [{ words: [{ text: "Widoczny", start: 0, end: 1 }] }],
  };
  const r = qc.checkGeometry({
    manifest: { ...manifest, inputs: { data: d, expectedFrames: 30 } },
    observations: { status: "measured", duration: 2, samples: [] },
    frameBounds: {
      frames: Array.from({ length: 30 }, (_, frame) => ({ frame, boxes: [] })),
    },
  });
  assert.notEqual(r.status, "pass");
});

const scanManifest = {
  signature: "frozen-scan",
  inputs: {
    data: {
      ...data,
      framing: undefined,
      captions: [{ words: [{ text: "Źdźbło", start: 0, end: 0.1 }] }],
    },
    expectedFrames: 2,
  },
  output: { width: 1080, height: 1920, fps: 30 },
};
const inventory = [{ id: "c0", role: "caption", from: 0, durationInFrames: 2 }];
const scan = () => ({
  measurementVersion: 1,
  collector: "remotion-dom-v1",
  manifestSignature: "frozen-scan",
  space: "output-normalized",
  frames: [0, 1].map((frame) => ({
    frame,
    expected: [{ id: "c0", role: "caption" }],
    hidden: [],
    issues: [],
    boxes: [
      { id: "c0", role: "caption", x: 0.2, y: 0.6, width: 0.3, height: 0.1 },
    ],
  })),
});
test("complete renderer inventory proves bounds coverage, but omitted element, stale signature and partial frames cannot", () => {
  const inspect = (frameBounds) =>
    qc.checkGeometry({
      manifest: scanManifest,
      expectedInventory: inventory,
      frameBounds,
    });
  assert.equal(
    inspect(scan()).findings.some(
      (f) => f.ruleId === "animation.measurement-provenance",
    ),
    false,
  );
  assert.equal(inspect(scan()).status, "unknown");
  const missing = scan();
  missing.frames[1].boxes = [];
  assert.equal(inspect(missing).status, "unknown");
  const empty = scan();
  empty.frames.forEach((f) => {
    f.expected = [];
    f.boxes = [];
  });
  assert.equal(inspect(empty).status, "unknown");
  const stale = scan();
  stale.manifestSignature = "old";
  assert.equal(inspect(stale).status, "unknown");
  const partial = scan();
  partial.frames.pop();
  assert.equal(inspect(partial).status, "unknown");
});
test("animation extrema and emoji edge escape fail even in partial scans", () => {
  const bounds = scan();
  bounds.frames[1].boxes.push({
    id: "emoji",
    role: "emoji",
    x: 0.86,
    y: 0.5,
    width: 0.1,
    height: 0.08,
  });
  bounds.frames[1].boxes.push({
    id: "c0",
    role: "caption",
    x: 0.05,
    y: 0.6,
    width: 0.3,
    height: 0.1,
  });
  const report = qc.checkGeometry({
    manifest: scanManifest,
    expectedInventory: inventory,
    frameBounds: bounds,
  });
  assert.equal(report.status, "fail");
  assert.ok(
    report.findings.some(
      (f) => f.ruleId === "text.safezone" && f.frameRange[0] === 1,
    ),
  );
});
test("unmeasured visual effects remain unknown despite complete boxes", () => {
  const bounds = scan();
  bounds.frames[0].issues = ["unsupported filter"];
  assert.equal(
    qc.checkGeometry({
      manifest: scanManifest,
      expectedInventory: inventory,
      frameBounds: bounds,
    }).status,
    "unknown",
  );
});

test("full caption scan without projected faces explicitly keeps face avoidance unknown", () => {
  const r = qc.checkGeometry({
    manifest: scanManifest,
    expectedInventory: inventory,
    frameBounds: scan(),
  });
  assert.ok(
    r.findings.some(
      (f) => f.ruleId === "text.face-evidence" && f.status === "unknown",
    ),
  );
});
test("stale boxes cannot attribute safezone failures to the current manifest", () => {
  const bounds = scan();
  bounds.manifestSignature = "old";
  bounds.frames[0].boxes[0].x = 0.95;
  const r = qc.checkGeometry({
    manifest: scanManifest,
    expectedInventory: inventory,
    frameBounds: bounds,
  });
  assert.equal(r.status, "unknown");
  assert.equal(
    r.findings.some((f) => f.status === "fail"),
    false,
  );
});
test("layout-only bounds flag risk without claiming clipped glyph pixels escaped", () => {
  const bounds = scan();
  bounds.frames[0].boxes[0] = {
    ...bounds.frames[0].boxes[0],
    x: -0.1,
    extent: "layout",
  };
  bounds.frames[0].issues = ["c0: unsupported clipPath"];
  const r = qc.checkGeometry({
    manifest: scanManifest,
    expectedInventory: inventory,
    frameBounds: bounds,
  });
  assert.equal(r.status, "unknown");
  assert.ok(
    r.findings.some(
      (f) => f.ruleId === "text.safezone" && f.status === "unknown",
    ),
  );
});

test("bound per-ID raster evidence replaces layout uncertainty; incomplete or forged masks cannot certify or fail", () => {
  const bounds = scan();
  bounds.measurementVersion = 2;
  bounds.collector = "remotion-raster-v1";
  bounds.frames.forEach((f) => {
    f.boxes[0].extent = "raster";
    f.rasters = [
      {
        id: "c0",
        role: "caption",
        method: "isolated-alpha-v1",
        manifestSignature: "frozen-scan",
        frame: f.frame,
        status: "measured",
        issues: [],
        width: 1080,
        height: 1920,
        pngSha256: "a".repeat(64),
        pixels: 100,
        bounds: { x: 216, y: 1152, width: 324, height: 192 },
      },
    ];
  });
  const inspect = (b) =>
    qc.checkGeometry({
      manifest: scanManifest,
      expectedInventory: inventory,
      frameBounds: b,
    });
  assert.equal(
    inspect(bounds).findings.some(
      (f) => f.ruleId === "animation.measurement-provenance",
    ),
    false,
  );
  const partial = globalThis.structuredClone(bounds);
  partial.frames[0].rasters = [];
  assert.ok(
    inspect(partial).findings.some(
      (f) => f.ruleId === "animation.measurement-provenance",
    ),
  );
  const fake = globalThis.structuredClone(bounds);
  fake.frames[0].boxes[0].x = 0.95;
  fake.frames[0].rasters[0].pngSha256 = "";
  assert.equal(inspect(fake).status, "unknown");
  assert.equal(
    inspect(fake).findings.some((f) => f.status === "fail"),
    false,
  );
  const missing = globalThis.structuredClone(bounds);
  missing.frames[0].rasters[0].status = "unknown";
  assert.ok(
    inspect(missing).findings.some(
      (f) => f.ruleId === "animation.measurement-provenance",
    ),
  );
});
