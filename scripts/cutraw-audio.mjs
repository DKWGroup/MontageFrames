// CutRaw C1: audio w czasie mastera (kamery referencyjnej) — wyrównanie co do próbki o offset źródła,
// wyciszenia cenzury z rampą (bez kliku), energia co 10 ms do najcichszej klatki i mówcy słowa, miks mowy do Whispera.
import { closeSync, openSync, renameSync, writeSync } from "node:fs";
import { decode, RATE } from "./cutraw-sync.mjs";

const CHUNK = 1 << 20;

// Dryf zegara (C3): offset(t) = offset + k·(t − at) w czasie mastera; k = 0 — stały offset.
export const offsetAt = ({ offset = 0, k = 0, at = 0 }, t) => offset + k * (t - at);
// Źródło grane w zegarze mastera: 1 s pliku = 1/(1−k) s mastera. 480 kHz, żeby zaokrąglenie asetrate dało błąd < 1 ppm
// (≤ 7 ms na 2 h). To przepróbkowanie, nie time-stretch — przy dziesiątkach ppm zmiana wysokości jest niesłyszalna.
export const stretchFilter = (k) => (k ? `aresample=480000,asetrate=${Math.round(480000 * (1 - k))}` : null);

// Źródło → próbki mastera [0, duration): cisza przed startem pliku i po jego końcu.
// filter: undefined = domyślny highpass z decode(), null = bez filtra.
async function aligned(src, { offset, k = 0, at: anchor = 0, duration, rate, filter = "highpass=f=80" }, onSamples) {
  const total = Math.round(duration * rate);
  const o0 = offsetAt({ offset, k, at: anchor }, 0);
  filter = [stretchFilter(k), filter].filter(Boolean).join(",") || null;
  let at = 0;
  const silence = (n) => {
    for (; n > 0; n -= CHUNK) {
      const k = Math.min(n, CHUNK);
      onSamples(new Float32Array(k), at);
      at += k;
    }
  };
  silence(Math.min(total, Math.max(0, Math.round((o0 / (1 - k)) * rate))));
  if (at < total)
    await decode(src, { start: Math.max(0, -o0), duration: (total - at) / rate, rate, filter }, (s) => {
      const n = Math.min(s.length, total - at);
      if (n <= 0) return;
      onSamples(n < s.length ? s.subarray(0, n) : s, at);
      at += n;
    });
  silence(total - at);
}

// Wzmocnienie w chwili t (wywołania z rosnącym t): 0 w wyciszeniu, liniowa rampa `ramp` przed i po.
export function gainAt(mutes) {
  const list = [...mutes].sort((a, b) => a.start - b.start);
  let i = 0;
  return (t) => {
    while (i < list.length && t > list[i].end + (list[i].ramp ?? 0)) i++;
    let g = 1;
    for (let k = i; k < list.length && list[k].start - (list[k].ramp ?? 0) <= t; k++) {
      const { start: a, end: b, ramp: r = 0 } = list[k];
      g = Math.min(g, t < a ? (a - t) / r : t > b ? (t - b) / r : 0);
    }
    return Math.min(1, g);
  };
}

const wavHeader = (samples, rate) => {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + samples * 3, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 3, 28);
  b.writeUInt16LE(3, 32);
  b.writeUInt16LE(24, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples * 3, 40);
  return b;
};

// WAV PCM 24-bit mono w czasie mastera; wyciszenia w sekundach mastera. Zapis przez *.tmp — przerwany nie zostawia pliku.
export async function renderMasterWav(src, out, { offset = 0, k = 0, at: anchor = 0, duration, mutes = [], rate = 48000 }) {
  const tmp = `${out}.tmp`;
  const fd = openSync(tmp, "w");
  try {
    writeSync(fd, wavHeader(Math.round(duration * rate), rate));
    const gain = gainAt(mutes);
    await aligned(src, { offset, k, at: anchor, duration, rate, filter: null }, (s, at) => {
      const buf = Buffer.alloc(s.length * 3);
      for (let i = 0; i < s.length; i++)
        buf.writeIntLE(Math.max(-8388608, Math.min(8388607, Math.round(s[i] * gain((at + i) / rate) * 8388607))), i * 3, 3);
      writeSync(fd, buf);
    });
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, out);
  return out;
}

// Energia (średni kwadrat) co 10 ms w czasie mastera.
export async function masterLevels(src, { offset = 0, k = 0, at: anchor = 0, duration }) {
  const per = RATE / 100;
  const out = new Float32Array(Math.ceil(duration * 100));
  let acc = 0;
  let n = 0;
  let j = 0;
  await aligned(src, { offset, k, at: anchor, duration, rate: RATE }, (s) => {
    for (const x of s) {
      acc += x * x;
      if (++n === per) {
        out[j++] = acc / per;
        acc = 0;
        n = 0;
      }
    }
  });
  return out;
}

// Miks mowy (mono 16 kHz, czas mastera) do Whispera i wykrywania ciszy: każde źródło przesunięte o swój offset.
export function mixArgs(sources, out, duration) {
  const parts = sources.map((s, i) => {
    const k = s.k ?? 0;
    const o0 = offsetAt(s, 0);
    // atrim działa po rozciągnięciu (czas mastera): początek pliku −o0 s = −o0/(1−k) s mastera.
    const shift = o0 >= 0 ? `adelay=${Math.round((o0 / (1 - k)) * RATE)}S:all=1` : `atrim=start=${-o0 / (1 - k)},asetpts=PTS-STARTPTS`;
    return `[${i}:a]aformat=channel_layouts=mono,${[stretchFilter(k), `aresample=${RATE}`].filter(Boolean).join(",")},${shift},apad,atrim=end=${duration}[a${i}]`;
  });
  const mix = sources.length > 1 ? `${sources.map((_, i) => `[a${i}]`).join("")}amix=inputs=${sources.length}:normalize=0[m]` : "[a0]anull[m]";
  return [
    "-hide_banner", "-v", "error", "-y",
    ...sources.flatMap((s) => ["-i", s.path]),
    "-filter_complex", [...parts, mix].join(";"),
    "-map", "[m]", "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", out,
  ];
}
