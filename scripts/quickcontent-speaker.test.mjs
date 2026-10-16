import test from "node:test";
import assert from "node:assert/strict";
import { buildSpeakerTracking } from "./quickcontent-speaker.mjs";
import {
  trackingPosition,
  validTracking,
} from "../src/quickcontent/framing.mjs";

// 4 próbki/s; lewa osoba (x 0,2) i prawa (x 0,7); `talk` = kto rusza ustami w danej sekundzie
const face = (x, mouth) => ({ x, y: 0.2, width: 0.1, height: 0.2, mouth });
const frame = (sec, k, talk) => [
  face(0.2, talk(sec) === "L" ? (k % 2 ? 0.1 : 0.02) : 0.02),
  face(0.7, talk(sec) === "R" ? (k % 2 ? 0.1 : 0.02) : 0.02),
];

test("rozmowa w dwóch: kadr na tym, kto mówi; materiał z newsa w całości; cięcia bez przejazdu", () => {
  const samples = [];
  // 0–4 s: szeroki plan, mówi L (0–2), potem R (2–4); 4–6 s: materiał bez twarzy; 6–8 s: zbliżenie R
  for (let sec = 0; sec < 4; sec++)
    for (let k = 0; k < 4; k++)
      samples.push(frame(sec, k, (s) => (s < 2 ? "L" : "R")));
  for (let k = 0; k < 8; k++) samples.push([]);
  for (let k = 0; k < 8; k++)
    samples.push([
      { x: 0.4, y: 0.15, width: 0.2, height: 0.4, mouth: k % 2 ? 0.12 : 0.03 },
    ]);
  const { framing, shots } = buildSpeakerTracking({
    samples,
    fps: 4,
    cuts: [4, 6],
    speech: [[0, 8]],
    width: 1920,
    height: 1080,
    duration: 8,
  });
  assert.deepEqual(
    shots.map((s) => s.kind),
    ["speaker", "footage", "speaker"],
  );
  assert.equal(shots[0].faces, 2);
  const at = (t) => trackingPosition(framing, t);
  const visible = 9 / 16 / (16 / 9);
  const faceX = (p) => p.centerX * (1 - visible) + visible / 2;
  assert.ok(Math.abs(faceX(at(1)) - 0.25) < 0.05, "L mówi → kadr na L");
  assert.ok(Math.abs(faceX(at(3)) - 0.75) < 0.05, "R mówi → kadr na R");
  assert.equal(at(5).fit, true, "materiał z newsa w całości");
  // zmiana mówcy w szerokim ujęciu = skok, nie przejazd przez środek stołu
  assert.ok(Math.abs(faceX(at(1.99)) - 0.25) < 0.05);
  assert.ok(validTracking(framing, 8));
});

test("twarze bez ruchu ust przy mowie = lektor na materiale → fit", () => {
  const still = Array.from({ length: 8 }, () => [face(0.4, 0.02)]);
  const { shots, framing } = buildSpeakerTracking({
    samples: still,
    fps: 4,
    speech: [[0, 2]],
    width: 1920,
    height: 1080,
    duration: 2,
  });
  assert.equal(shots[0].kind, "footage");
  assert.equal(trackingPosition(framing, 1).fit, true);
});

test("a dominant later face never supplies a crop for an earlier camera shot without that person", () => {
  const samples = Array.from({ length: 16 }, (_, i) => [
    {
      x: i < 4 ? 0.2 : 0.7,
      y: 0.1,
      width: 0.12,
      height: 0.4,
      mouth: i % 2 ? 0.12 : 0.02,
    },
  ]);
  const { framing } = buildSpeakerTracking({
    samples,
    fps: 4,
    speech: [[0, 4]],
    width: 1920,
    height: 1080,
    duration: 4,
    responsive: true,
  });
  const p = trackingPosition(framing, 0),
    visible = 9 / 16 / (16 / 9);
  assert.ok(
    Math.abs(p.centerX * (1 - visible) + visible / 2 - 0.26) < 0.05,
    "initial frame follows the person actually visible then",
  );
});
