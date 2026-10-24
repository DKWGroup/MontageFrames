import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { alignEnvelopes, correlate, ENV_RATE, pcm, probe, RATE, syncFiles } from "./cutraw-sync.mjs";
import { renderMasterWav } from "./cutraw-audio.mjs";

// Syntetyczna „mowa”: sylaby 80–250 ms (szum + ton krtaniowy, okno Hanna), przerwy i pauzy między frazami.
const rng = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function speech(seconds, seed) {
  const r = rng(seed);
  const out = new Float32Array(Math.round(seconds * RATE));
  let i = 0;
  let n = 0;
  while (i < out.length) {
    const len = Math.round((0.08 + 0.17 * r()) * RATE);
    const amp = 0.2 + 0.4 * r();
    const f = 120 + 180 * r();
    for (let k = 0; k < len && i + k < out.length; k++) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / len);
      out[i + k] = amp * hann * (0.5 * (r() * 2 - 1) + Math.sin((2 * Math.PI * f * k) / RATE));
    }
    i += len + Math.round((++n % 5 ? 0.03 + 0.12 * r() : 0.3 + 0.9 * r()) * RATE);
  }
  return out;
}
// Inny mikrofon: wzmocnienie, filtr dolnoprzepustowy, szum tła.
function otherMic(x, gain, seed) {
  const r = rng(seed);
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) out[i] = (y = 0.6 * x[i] * gain + 0.4 * y) + 0.004 * (r() * 2 - 1);
  return out;
}
const concat = (...xs) => {
  const out = new Float32Array(xs.reduce((n, x) => n + x.length, 0));
  let at = 0;
  for (const x of xs) {
    out.set(x, at);
    at += x.length;
  }
  return out;
};
const envOf = (x) => {
  const per = RATE / ENV_RATE;
  const out = new Float32Array(Math.floor(x.length / per));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let k = 0; k < per; k++) s += x[i * per + k] ** 2;
    out[i] = Math.log10(s / per + 1e-7);
  }
  return out;
};
function wav(file, x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + x.length * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  writeFileSync(file, b);
  return file;
}

test("korelacja: znajduje przesunięcie okna i daje wysoki score tylko dla pasującego sygnału", () => {
  const a = envOf(speech(60, 1));
  const hit = correlate(a, a.subarray(1234, 1234 + 1500));
  assert.equal(hit.lag, 1234);
  assert.ok(hit.r > 0.999);
  const miss = correlate(a, envOf(speech(15, 2)));
  assert.ok(hit.score > 2 * miss.score, `${hit.score} vs ${miss.score}`);
});

test("obwiednie: mikrofon włączony później (offset dodatni) i wcześniej, dłuższy od kamery (offset ujemny)", () => {
  const ref = speech(240, 3);
  const later = otherMic(ref.subarray(Math.round(12.34 * RATE), Math.round(230 * RATE)), 0.3, 4);
  const a = alignEnvelopes(envOf(ref), envOf(later));
  assert.ok(Math.abs(a.offset - 12.34) <= 0.01, `offset ${a.offset}`);
  assert.ok(Math.abs(a.drift) <= 0.01);
  const earlier = otherMic(concat(speech(30.5, 5), ref, speech(20, 6)), 2, 7);
  const b = alignEnvelopes(envOf(ref), envOf(earlier));
  assert.ok(Math.abs(b.offset + 30.5) <= 0.01, `offset ${b.offset}`);
});

test("pliki przez FFmpeg: przesunięcie co do milisekundy, inny plik oznaczony do sprawdzenia", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cutraw-sync-"));
  const ref = speech(90, 8);
  const camera = wav(path.join(dir, "kamera 1.wav"), ref);
  const mic = wav(path.join(dir, "mikrofon.wav"), otherMic(ref.subarray(Math.round(1.2345 * RATE), Math.round(84 * RATE)), 0.3, 9));
  const stranger = wav(path.join(dir, "inny.wav"), speech(80, 10));
  const [m, s] = await syncFiles(camera, [mic, stranger]);
  assert.ok(Math.abs(m.offset - 1.2345) <= 0.001, `offset ${m.offset}`);
  assert.equal(m.method, "pcm");
  assert.equal(m.confident, true, `score ${m.score}`);
  assert.equal(s.confident, false, `score ${s.score}`);
});

test("dryf zegara: pomiar w 3 oknach co do próbki i korekta audio — początek i koniec zgodne z kamerą", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cutraw-drift-"));
  const ref = speech(240, 11);
  const camera = wav(path.join(dir, "kamera.wav"), ref);
  // Mikrofon włączony 3,21 s po kamerze, zegar wolniejszy o 300 ppm: 1 s mikrofonu = 1,0003 s kamery.
  const e = 3e-4;
  const start = 3.21;
  const n = Math.floor(((236 - start) / (1 + e)) * RATE);
  const stretched = Float32Array.from({ length: n }, (_, i) => {
    const x = (start + (i / RATE) * (1 + e)) * RATE;
    const j = Math.floor(x);
    return ref[j] + (ref[j + 1] - ref[j]) * (x - j);
  });
  const mic = wav(path.join(dir, "mikrofon.wav"), otherMic(stretched, 0.4, 12));
  const [m] = await syncFiles(camera, [mic]);
  const [w0, w1, w2] = m.windows;
  const k = (w2.offset - w0.offset) / (w2.at - w0.at);
  assert.ok(w0.pcm && w1.pcm && w2.pcm, JSON.stringify(m.windows));
  assert.ok(Math.abs(k - e / (1 + e)) < 1e-5, `k ${k}`);
  assert.ok(m.drift > 0.04, `dryf ${m.drift}`); // > ½ klatki → processProject włączy korektę
  // Skorygowane audio w czasie kamery: okna 2 s z początku i końca w ±2 ms (bez korekty koniec rozjechałby się o ~31 ms).
  const out = await renderMasterWav(mic, path.join(dir, "mowa.wav"), { offset: m.offset, k, at: w1.at, duration: 236, rate: RATE });
  for (const t of [10, 225]) {
    const got = await pcm(out, { start: t - 0.05, duration: 2.1 });
    const c = correlate(got, ref.subarray(t * RATE, (t + 2) * RATE));
    assert.ok(Math.abs(c.lag - 0.05 * RATE) <= RATE / 500, `${t} s: ${(c.lag / RATE - 0.05) * 1000} ms`);
  }
});

test("probe: fps, rozdzielczość i audio pliku z kamery", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cutraw-probe-"));
  const file = path.join(dir, "kamera.mp4");
  execFileSync("ffmpeg", [
    "-v", "error", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=25:duration=2",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=2:sample_rate=48000",
    "-c:v", "libx264", "-c:a", "aac", "-shortest", file,
  ]);
  const p = await probe(file);
  assert.deepEqual(p.video, { width: 320, height: 180, fps: "25/1", vfr: false });
  assert.deepEqual(p.audio, { channels: 1, sampleRate: 48000 });
  assert.ok(Math.abs(p.duration - 2) < 0.1);
});
