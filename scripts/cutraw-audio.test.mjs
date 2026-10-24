import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { gainAt, masterLevels, mixArgs, renderMasterWav } from "./cutraw-audio.mjs";
import { pcm } from "./cutraw-sync.mjs";

const R = 48000;
function wav16(file, x, rate = R) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + x.length * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(x[i] * 32767), 44 + i * 2);
  writeFileSync(file, b);
  return file;
}
const read24 = (file) => {
  const b = readFileSync(file);
  assert.equal(b.readUInt16LE(34), 24);
  const n = b.readUInt32LE(40) / 3;
  return Float64Array.from({ length: n }, (_, i) => b.readIntLE(44 + i * 3, 3) / 8388607);
};
const dir = () => mkdtempSync(path.join(tmpdir(), "cutraw-audio-"));

test("wzmocnienie: zero w wyciszeniu, liniowe rampy 5 ms przed i po", () => {
  const g = gainAt([{ start: 1, end: 1.2, ramp: 0.005 }]);
  assert.deepEqual([0.9, 0.9975, 1, 1.1, 1.2, 1.2025, 1.3].map((t) => Math.round(g(t) * 1000) / 1000), [1, 0.5, 0, 0, 0, 0.5, 1]);
});

test("WAV mastera: przesunięcie co do próbki w obie strony, długość = master, cisza poza plikiem", async () => {
  const d = dir();
  const x = new Float32Array(R);
  x[4800] = 0.9; // impuls w 0,1 s pliku
  const src = wav16(path.join(d, "mikrofon.wav"), x);
  const later = read24(await renderMasterWav(src, path.join(d, "a.wav"), { offset: 0.25, duration: 2 }));
  assert.equal(later.length, 2 * R);
  assert.equal(later.findIndex((v) => Math.abs(v) > 0.5), 4800 + 12000);
  assert.ok(later.subarray(R + 12000).every((v) => v === 0));
  const earlier = read24(await renderMasterWav(src, path.join(d, "b.wav"), { offset: -0.05, duration: 1 }));
  assert.equal(earlier.findIndex((v) => Math.abs(v) > 0.5), 4800 - 2400);
});

test("WAV mastera: cenzura wycisza do zera w czasie mastera, reszta nietknięta", async () => {
  const d = dir();
  const x = Float32Array.from({ length: R }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / R));
  const src = wav16(path.join(d, "ton.wav"), x);
  const y = read24(await renderMasterWav(src, path.join(d, "c.wav"), { offset: 0.1, duration: 1.1, mutes: [{ start: 0.6, end: 0.7, ramp: 0.005 }] }));
  assert.ok(y.subarray(0.6 * R, 0.7 * R).every((v) => v === 0));
  const peak = (a, b) => Math.max(...y.subarray(a * R, b * R).map(Math.abs));
  assert.ok(Math.abs(peak(0.3, 0.5) - 0.5) < 0.01);
  assert.ok(Math.abs(peak(0.72, 0.9) - 0.5) < 0.01);
});

test("poziomy i miks: energia w ramkach mastera, miks dwóch mikrofonów z różnymi offsetami", async () => {
  const d = dir();
  const tone = (from, to) => Float32Array.from({ length: R }, (_, i) => (i >= from * R && i < to * R ? 0.5 * Math.sin((2 * Math.PI * 1000 * i) / R) : 0));
  const a = wav16(path.join(d, "a.wav"), tone(0.3, 0.5));
  const lv = await masterLevels(a, { offset: 0.2, duration: 1.5 });
  assert.equal(lv.length, 150);
  assert.ok(lv[60] > 0.05 && lv[40] < 1e-6 && lv[75] < 1e-6, `${lv[40]} ${lv[60]} ${lv[75]}`);
  const b = wav16(path.join(d, "b.wav"), tone(0.1, 0.2));
  const out = path.join(d, "mix.wav");
  execFileSync("ffmpeg", mixArgs([{ path: a, offset: 0.2 }, { path: b, offset: -0.05 }], out, 1.5));
  const m = await pcm(out, { filter: null });
  assert.equal(m.length, 1.5 * 16000);
  const loud = (t0, t1) => Math.max(...m.subarray(t0 * 16000, t1 * 16000).map(Math.abs)) > 0.3;
  assert.deepEqual([loud(0.06, 0.14), loud(0.52, 0.68), loud(0.2, 0.45), loud(0.75, 1.4)], [true, true, false, false]);
});

test("dryf: źródło w zegarze mastera — impuls na początku i końcu tam, gdzie wskazuje offset(t), także w miksie", async () => {
  const d = dir();
  const x = new Float32Array(52 * R);
  for (const s of [1, 50]) x[s * R] = 0.9;
  const src = wav16(path.join(d, "dryf.wav"), x);
  const sync = { offset: 0.5, k: 1e-3, at: 30 };
  // s = t − offset(t) → t = (s + offset(0)) / (1 − k)
  const expect = (s) => (s + sync.offset - sync.k * sync.at) / (1 - sync.k);
  const peakAt = (y, rate, t) => {
    const a = Math.round((t - 0.05) * rate);
    let best = a;
    for (let i = a; i < a + 0.1 * rate; i++) if (Math.abs(y[i]) > Math.abs(y[best])) best = i;
    return best / rate;
  };
  const y = read24(await renderMasterWav(src, path.join(d, "m.wav"), { ...sync, duration: 53, rate: R }));
  for (const s of [1, 50]) assert.ok(Math.abs(peakAt(y, R, expect(s)) - expect(s)) < 0.0002, `${s}: ${peakAt(y, R, expect(s))} vs ${expect(s)}`);
  // bez korekty koniec rozjechałby się o ~20 ms
  assert.ok(Math.abs(expect(50) - (50 + sync.offset)) > 0.015);
  const out = path.join(d, "mix.wav");
  execFileSync("ffmpeg", mixArgs([{ path: src, ...sync }], out, 53));
  const m = await pcm(out, { filter: null });
  for (const s of [1, 50]) assert.ok(Math.abs(peakAt(m, 16000, expect(s)) - expect(s)) < 0.0005, `miks ${s}`);
});
