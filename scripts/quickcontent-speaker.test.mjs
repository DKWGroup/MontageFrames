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

test("cuts near the beginning and end remain exact shot boundaries, without reusing earlier faces",()=>{
 const samples=Array.from({length:8},(_,i)=>[face(i===0?0.15:i===7?0.8:0.45,i%2?0.1:0.02)]);
 const {framing,shots}=buildSpeakerTracking({samples,fps:4,cuts:[0.25,0.25,1.75,NaN,-2,3],speech:[[0,2]],width:1920,height:1080,duration:2,responsive:true});
 assert.deepEqual(shots.map(s=>[s.start,s.end]),[[0,0.25],[0.25,1.75],[1.75,2]]);
 assert.equal(new Set(shots.map(s=>s.shotId)).size,3);
 const visible=9/16/(16/9),center=t=>{const p=trackingPosition(framing,t);return p.centerX*(1-visible)+visible/2;};
 assert.ok(center(0.24)<0.3);assert.ok(center(0.25)>0.45);assert.ok(center(1.75)>0.8);
 assert.ok(validTracking(framing,2));
});

test("a sub-sample shot without evidence uses a neutral fit instead of borrowing a different camera",()=>{
 const {framing,shots}=buildSpeakerTracking({samples:[[face(0.15,0.1)],[face(0.8,0.1)]],fps:4,cuts:[0.1,0.2],speech:[[0,0.5]],width:1920,height:1080,duration:0.5,responsive:true});
 assert.equal(shots.length,3);assert.equal(trackingPosition(framing,0.15).fit,true);
});

test("new shot identities prevent interpolation across shots even when a cut flag is missing",()=>{
 const framing={mode:"crop",centerX:0.1,centerY:0.5,tracking:[{time:0,centerX:0.1,centerY:0.5,shotId:"a"},{time:1,centerX:0.9,centerY:0.5,shotId:"b"}]};
 assert.equal(trackingPosition(framing,0.9).centerX,0.1);assert.equal(trackingPosition(framing,1).centerX,0.9);
});

test("Bisanz (fitFootage: false): ujęcie bez twarzy zostaje w kadrze poprzedniego mówcy, bez fit", () => {
  const samples = [];
  for (let k = 0; k < 8; k++)
    samples.push([{ x: 0.6, y: 0.15, width: 0.2, height: 0.4, mouth: k % 2 ? 0.12 : 0.03 }]);
  for (let k = 0; k < 8; k++) samples.push([]);
  const { framing } = buildSpeakerTracking({
    samples, fps: 4, cuts: [2], speech: [[0, 4]], width: 1920, height: 1080, duration: 4, fitFootage: false,
  });
  const before = trackingPosition(framing, 1), after = trackingPosition(framing, 3);
  assert.equal(after.fit, undefined);
  assert.equal(after.centerX, before.centerX);
  assert.ok(validTracking(framing, 4));
});
