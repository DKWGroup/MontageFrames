import test from "node:test";
import assert from "node:assert/strict";
import * as qc from "./media-check.mjs";
const manifest = {
  signature: "source-one",
  inputs: { data: { segments: [{ start: 1, end: 3 }] } },
  output: { width: 720, height: 1280, fps: 30 },
};
const probe = {
  width: 1920,
  height: 1080,
  duration: 4,
  streams: [
    { codec_type: "video", avg_frame_rate: "30/1", r_frame_rate: "30/1" },
    { codec_type: "audio" },
  ],
};
test("missing audio, truncated ranges and invalid files fail media checks", () => {
  assert.equal(
    qc.checkMedia({
      manifest,
      probe: { ...probe, streams: probe.streams.slice(0, 1) },
    }).status,
    "fail",
  );
  assert.equal(
    qc.checkMedia({ manifest, probe: { ...probe, duration: 2 } }).status,
    "fail",
  );
  assert.equal(
    qc.checkMedia({ manifest, probe: { ...probe, width: 0 } }).status,
    "fail",
  );
});
test("VFR without measured frame-to-PTS map remains unknown; no fake frame identity", () => {
  const r = qc.checkMedia({
    manifest,
    probe: {
      ...probe,
      streams: [
        { ...probe.streams[0], avg_frame_rate: "29000/1001" },
        probe.streams[1],
      ],
    },
  });
  assert.equal(r.status, "unknown");
  assert.ok(r.findings.some((f) => f.ruleId === "media.frame-map"));
});
test("portrait render dimensions are checked separately from horizontal source", () => {
  assert.notEqual(qc.checkMedia({ manifest, probe }).status, "fail");
  assert.equal(
    qc.checkMedia({ manifest, probe, kind: "render" }).status,
    "fail",
  );
});

test("a single unrelated PTS sample cannot prove complete decoding of a source", () => {
  const r = qc.checkMedia({
    manifest,
    probe,
    samples: { frameMap: [{ frame: 900, pts: 900 }], decodeComplete: true },
  });
  assert.notEqual(r.status, "pass");
});
