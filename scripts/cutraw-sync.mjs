#!/usr/bin/env node
// CutRaw C1: synchronizacja kamer i mikrofonów po dźwięku (bez klapsa i timecode'u).
// Obwiednia log-energii co 10 ms (odporna na inne wzmocnienie i akustykę) → korelacja zgrubna 20 Hz → 100 Hz w 3 oknach → PCM 16 kHz.
// offset = czas mastera − czas źródła (zdarzenie z mastera w t jest w źródle w t − offset).
// CLI: node scripts/cutraw-sync.mjs <kamera-referencyjna> <plik…>
import { execFile, spawn } from "node:child_process";
import console from "node:console";
import process from "node:process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

export const RATE = 16000;
export const ENV_RATE = 100;
// Pewne = wyraźny pik (score; sygnał okresowy daje kilka) i zgodny kształt w 3 oknach (r). Przy krótkim nagraniu score
// jest niższy, więc wystarcza słabszy pik, gdy kształt zgadza się mocno — zły pik nie daje wysokiego r w oknach.
// ponytail: progi z syntetyków (pasujące 10,6 / 0,96 i 5,7 / 0,88 przy 39 s, obce 2,4 / 0,05, okresowe 2,7 / 1); skalibrować na C0.
const sure = (score, r) => (score >= 6 && r >= 0.5) || (score >= 4 && r >= 0.8);

const decodeArgs = (file, { start = 0, duration, rate = RATE, filter = "highpass=f=80" } = {}) => [
  "-hide_banner", "-v", "error",
  ...(start > 0 ? ["-ss", String(start)] : []),
  "-i", file,
  ...(duration ? ["-t", String(duration)] : []),
  "-vn", "-ac", "1", "-ar", String(rate), ...(filter ? ["-af", filter] : []), "-f", "f32le", "pipe:1",
];

// Strumieniowe dekodowanie mono float: długi plik nie trafia w całości do pamięci.
export function decode(file, opts, onSamples) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", decodeArgs(file, opts));
    let rest = null;
    let err = "";
    ff.stdout.on("data", (chunk) => {
      const buf = rest ? Buffer.concat([rest, chunk]) : chunk;
      const n = buf.length >> 2;
      rest = buf.length & 3 ? buf.subarray(n * 4) : null;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
      onSamples(out);
    });
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", reject);
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`FFmpeg nie odczytał audio: ${file}\n${err.trim()}`)),
    );
  });
}

export async function pcm(file, opts) {
  const parts = [];
  await decode(file, opts, (s) => parts.push(s));
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export async function envelope(file, opts) {
  const per = RATE / ENV_RATE;
  const out = [];
  let acc = 0;
  let n = 0;
  await decode(file, opts, (s) => {
    for (const x of s) {
      acc += x * x;
      if (++n === per) {
        out.push(Math.log10(acc / per + 1e-7));
        acc = 0;
        n = 0;
      }
    }
  });
  return Float32Array.from(out);
}

export function decimate(a, f) {
  const out = new Float32Array(Math.floor(a.length / f));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let j = 0; j < f; j++) s += a[i * f + j];
    out[i] = s / f;
  }
  return out;
}

// Pearson r okna `b` przesuwanego po `a`; lag k = b[0] leży na a[k]. score = odstęp piku od średniej w odchyleniach std.
// ponytail: O(lagi × okno) bez FFT — ~0,5 s dla 2 h przy 20 Hz; FFT, gdy materiał będzie dłuższy.
export function correlate(a, b, lo = 0, hi = a.length - b.length) {
  const m = b.length;
  lo = Math.max(0, Math.round(lo));
  hi = Math.min(a.length - m, Math.round(hi));
  if (m < 2 || hi < lo) throw new Error("Za mało wspólnego nagrania do synchronizacji.");
  let mb = 0;
  for (let i = 0; i < m; i++) mb += b[i];
  mb /= m;
  const bc = new Float64Array(m);
  let sb = 0;
  for (let i = 0; i < m; i++) sb += (bc[i] = b[i] - mb) ** 2;
  const p1 = new Float64Array(a.length + 1);
  const p2 = new Float64Array(a.length + 1);
  for (let i = 0; i < a.length; i++) {
    p1[i + 1] = p1[i] + a[i];
    p2[i + 1] = p2[i] + a[i] * a[i];
  }
  const rs = new Float64Array(hi - lo + 1);
  let best = 0;
  for (let k = lo; k <= hi; k++) {
    let dot = 0; // Σ bc = 0, więc średnia okna `a` się skraca
    for (let i = 0; i < m; i++) dot += a[k + i] * bc[i];
    const va = p2[k + m] - p2[k] - (p1[k + m] - p1[k]) ** 2 / m;
    const r = va > 1e-12 && sb > 1e-12 ? dot / Math.sqrt(va * sb) : 0;
    rs[k - lo] = r;
    if (r > rs[best]) best = k - lo;
  }
  let mean = 0;
  for (const r of rs) mean += r;
  mean /= rs.length;
  let v = 0;
  for (const r of rs) v += (r - mean) ** 2;
  const sd = Math.sqrt(v / rs.length);
  return { lag: lo + best, r: rs[best], score: sd > 0 ? (rs[best] - mean) / sd : 0 };
}

const median = (xs) => [...xs].sort((x, y) => x - y)[xs.length >> 1];

// Obwiednie 100 Hz → offset (s), score, pomiar w 3 oknach (dryf zegara = koniec − początek).
export function alignEnvelopes(ref, src, { coarse = 5, window = 120, fine = 60, search = 0.2 } = {}) {
  const R = decimate(ref, coarse);
  const S = decimate(src, coarse);
  const cr = ENV_RATE / coarse;
  // Okno ≤ połowa krótszego nagrania, żeby zostało miejsce na przesunięcie w obie strony.
  const w = Math.min(Math.round(window * cr), Math.floor(Math.min(R.length, S.length) / 2));
  let offset;
  let score;
  // Krótsze nagranie szukamy w dłuższym (mikrofon bywa włączony przed kamerą i po niej).
  if (S.length <= R.length) {
    const s0 = (S.length - w) >> 1;
    const c = correlate(R, S.subarray(s0, s0 + w));
    [offset, score] = [(c.lag - s0) / cr, c.score];
  } else {
    const r0 = (R.length - w) >> 1;
    const c = correlate(S, R.subarray(r0, r0 + w));
    [offset, score] = [(r0 - c.lag) / cr, c.score];
  }
  const lo = Math.max(0, offset);
  const hi = Math.min(ref.length, offset * ENV_RATE + src.length) / ENV_RATE;
  const len = Math.min(fine, (hi - lo) / 3);
  if (len < 5) throw new Error("Za mało wspólnego nagrania do synchronizacji (< 15 s).");
  const windows = [0.15, 0.5, 0.85].map((f) => {
    const t = Math.min(Math.max(lo + f * (hi - lo) - len / 2, lo + search), hi - len - search);
    const a = Math.round(t * ENV_RATE);
    const expect = (t - offset) * ENV_RATE;
    const c = correlate(src, ref.subarray(a, a + Math.round(len * ENV_RATE)), expect - search * ENV_RATE, expect + search * ENV_RATE);
    return { at: a / ENV_RATE, offset: (a - c.lag) / ENV_RATE, r: c.r };
  });
  return {
    offset: median(windows.map((x) => x.offset)),
    score,
    r: median(windows.map((x) => x.r)),
    drift: windows[2].offset - windows[0].offset,
    windows,
  };
}

// Doprecyzowanie co do próbki w środkowym oknie; słaba korelacja PCM (daleka kamera) = zostaje wynik z obwiedni.
export async function refinePcm(refFile, srcFile, offset, at, { length = 8, search = 0.025 } = {}) {
  const ref = await pcm(refFile, { start: at, duration: length });
  const from = at - offset - search;
  const start = Math.max(0, from);
  const src = await pcm(srcFile, { start, duration: length + 2 * search });
  const c = correlate(src, ref, 0, Math.round((2 * search - (start - from)) * RATE));
  return { offset: at - (start + c.lag / RATE), r: c.r };
}

export async function syncFiles(refFile, files) {
  const ref = await envelope(refFile);
  const out = [];
  for (const file of files) {
    const a = alignEnvelopes(ref, await envelope(file));
    // Każde okno doprecyzowane co do próbki: dryf z obwiedni ma rozdzielczość 10 ms, a próg korekty to ½ klatki (17–20 ms).
    // Okna brzegowe krótsze (4 s), żeby sam dryf nie rozmył korelacji. Słaba korelacja = zostaje wynik z obwiedni.
    const windows = [];
    for (const [i, w] of a.windows.entries()) {
      const p = await refinePcm(refFile, file, w.offset, w.at, { length: i === 1 ? 8 : 4 });
      const ok = p.r >= 0.3 && Math.abs(p.offset - w.offset) <= 0.02;
      windows.push({ ...w, offset: ok ? p.offset : w.offset, pcm: ok });
    }
    const [w0, w1, w2] = windows;
    // Środek nie dał korelacji PCM, brzegi tak → offset w środku z prostej między brzegami (dokładniej niż obwiednia 10 ms).
    if (!w1.pcm && w0.pcm && w2.pcm) Object.assign(w1, { offset: w0.offset + ((w2.offset - w0.offset) * (w1.at - w0.at)) / (w2.at - w0.at), pcm: true });
    const pcmOk = w1.pcm;
    const drift = w0.pcm && w2.pcm ? w2.offset - w0.offset : a.drift;
    out.push({
      file,
      offset: Math.round((pcmOk ? windows[1].offset : a.offset) * 1e5) / 1e5,
      score: Math.round(a.score * 10) / 10,
      r: Math.round(a.r * 100) / 100,
      confident: sure(a.score, a.r),
      drift: Math.round(drift * 1e4) / 1e4,
      windows,
      method: pcmOk ? "pcm" : "envelope",
    });
  }
  return out;
}

const fraction = (s) => {
  const [n, d = 1] = String(s ?? "0").split("/").map(Number);
  return d ? n / d : 0;
};

export async function probe(file) {
  const { stdout } = await promisify(execFile)("ffprobe", [
    "-v", "error", "-print_format", "json", "-show_format", "-show_streams", file,
  ]);
  const info = JSON.parse(stdout);
  const v = info.streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const a = info.streams.find((s) => s.codec_type === "audio");
  return {
    duration: +info.format.duration,
    video: v
      ? { width: v.width, height: v.height, fps: v.r_frame_rate, vfr: Math.abs(fraction(v.avg_frame_rate) - fraction(v.r_frame_rate)) > 0.01 }
      : null,
    audio: a ? { channels: a.channels, sampleRate: +a.sample_rate } : null,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [ref, ...files] = process.argv.slice(2);
  if (!ref || !files.length) {
    console.error("Użycie: node scripts/cutraw-sync.mjs <kamera-referencyjna> <plik…>");
    process.exit(1);
  }
  for (const r of await syncFiles(ref, files))
    console.log(`${r.file}: offset ${r.offset} s · score ${r.score}${r.confident ? "" : " · DO SPRAWDZENIA"} · dryf ${r.drift} s · ${r.method}`);
}
