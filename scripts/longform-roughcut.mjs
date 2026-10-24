#!/usr/bin/env node
// LongForm L1: deterministyczny rough cut — cisza, wtrącenia z leksykonu, cenzura przekleństw.
// Wynik to propozycje w roughcut.json; decyzje użytkowniczki przeżywają ponowne `propose` (merge po id).
// CLI: node scripts/longform-roughcut.mjs propose <rolka>   |   apply <rolka> (segments + mutes -> reel.json)
import { execFileSync, spawnSync } from "node:child_process";
import console from "node:console";
import process from "node:process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { detectSilences } from "./prep.mjs";
import { RoughCut } from "../src/longform/schema.mjs";
import { applyDecisions } from "../src/longform/cuts.mjs";

export { applyDecisions };

const ms = (t) => Math.round(t * 1000) / 1000;
const bare = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const PROTECTED = new Set(["nie", "nigdy", "bez", "ale", "jeśli", "jeżeli", "chyba"]);

export const isProfane = (text, { stems, except = [] }) => {
  const w = bare(text);
  return !!w && !except.includes(w) && stems.some((s) => w.includes(s));
};

const cutOf = (kind, start, end, extra) => ({
  id: `${kind}-${ms(start).toFixed(3)}`,
  start: ms(start),
  end: ms(end),
  wordIds: [],
  kind,
  reason: "",
  confidence: 1,
  auto: true,
  decision: "cut",
  ...extra,
});

// Przedział [lo, hi] minus słowa (Parakeet „rozlewa” końce słów, więc słowo zawsze wygrywa z ciszą).
const freeIntervals = (lo, hi, words) => {
  const out = [];
  let a = lo;
  for (const w of [...words].sort((x, y) => x.start - y.start)) {
    if (w.end <= a || w.start >= hi) continue;
    if (w.start > a) out.push([a, w.start]);
    a = Math.max(a, w.end);
  }
  if (a < hi) out.push([a, hi]);
  return out;
};

export function silenceCuts(silences, words, { minGap = 0.45, breath = 0.15 } = {}) {
  return silences.flatMap((s) =>
    freeIntervals(s.start, s.end, words)
      .filter(([a, b]) => b - a >= minGap)
      .map(([a, b]) => cutOf("silence", a + breath, b - breath, { reason: `cisza ${ms(b - a)} s` })),
  );
}

// Dźwięk bez słowa w transkrypcie (np. przeciągnięte „yyy”, którego ASR nie zapisał).
export const voicedGaps = (silences, words, duration) =>
  freeIntervals(0, duration, [...words, ...silences]).map(([start, end]) => ({ start, end }));

// Whisper zwraca czasem słowo o zerowej długości (start == end). Bez czasu nie da się go wyciąć ani wyciszyć
// (przekleństwo zostałoby słyszalne), a puste cięcie psuje walidację projektu — dajemy mu `min` s z wolnego
// miejsca obok (najpierw po słowie, potem przed). Słowo ściśnięte z obu stron zostaje bez czasu; budowniczy cięć je pomijają.
export function timedWords(words, min = 0.06) {
  return words.map((w, i) => {
    if (w.end > w.start) return w;
    const end = Math.max(w.start, Math.min(w.start + min, words[i + 1]?.start ?? Infinity));
    const start = Math.min(w.start, Math.max(end - min, words[i - 1]?.end ?? 0));
    return end > start ? { ...w, start: ms(start), end: ms(end) } : w;
  });
}

export function fillerCuts(words, { sure, ambiguous }, voicedGaps = []) {
  const cuts = [];
  const multi = ambiguous.map((p) => p.split(" "));
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!(w.end > w.start)) continue;
    if (sure.includes(bare(w.text))) {
      cuts.push(cutOf("filler", w.start, w.end, { wordIds: [w.id], reason: w.text, confidence: 0.95 }));
      continue;
    }
    const hit = multi.find((p) => p.every((x, j) => words[i + j] && bare(words[i + j].text) === x));
    if (!hit) continue;
    const span = words.slice(i, i + hit.length);
    if (!(span.at(-1).end > w.start)) continue;
    cuts.push(
      cutOf("filler", w.start, span.at(-1).end, {
        wordIds: span.map((x) => x.id),
        reason: hit.join(" "),
        confidence: 0.5,
        auto: false,
        decision: "undecided",
      }),
    );
    i += hit.length - 1;
  }
  for (const g of voicedGaps)
    if (g.end - g.start >= 0.25)
      cuts.push(cutOf("filler", g.start, g.end, { reason: "dźwięk bez słowa", confidence: 0.6, auto: false, decision: "undecided" }));
  return cuts.sort((a, b) => a.start - b.start);
}

// LongForm: wyciszone `muteRatio` słowa + kruk. CutRaw: `keepHead` liter słychać na początku, `keepTail` (0/1) na końcu,
// czas słowa dzielony proporcjonalnie na litery; zawsze zostaje wyciszona co najmniej jedna litera.
export function censorMutes(words, profanity, { muteRatio = 0.8, tail = 0.03, ramp = 0.005, keepHead = null, keepTail = 0, sfx = "kruk" } = {}) {
  return words
    .filter((w) => w.end > w.start && (profanity.extra?.has(w.id) || isProfane(w.text, profanity)))
    .map((w) => {
      const dur = w.end - w.start;
      if (keepHead == null) return { wordId: w.id, start: ms(w.start + (1 - muteRatio) * dur), end: ms(w.end + tail), ramp, sfx };
      const letters = Math.max(1, [...bare(w.text)].length);
      const t = letters > 2 ? Math.min(keepTail, 1) : 0;
      const h = Math.max(0, Math.min(keepHead, letters - 1 - t));
      const head = h ? Math.min(Math.max((h / letters) * dur, 0.06), 0.45 * dur) : 0;
      return { wordId: w.id, start: ms(w.start + head), end: ms(t ? w.end - (t / letters) * dur : w.end + tail), ramp, sfx };
    });
}

// Tempo cięcia ciszy (CutRaw): od jakiej pauzy tniemy i ile oddechu zostaje na krawędziach.
export const PACE = {
  spokojne: { minGap: 0.6, breath: 0.2 },
  standard: { minGap: 0.4, breath: 0.12 },
  "gęste": { minGap: 0.28, breath: 0.08 },
};

// Krawędź cięcia → granica klatki z najmniejszą energią (suma mikrofonów, ramki 1/rate s) w ±tolerance.
// W sąsiednie słowo wolno wejść najwyżej o `slack` (pół klatki, w granicach niedokładności czasów Whispera) —
// inaczej wtrącenie między stykającymi się słowami nie miałoby żadnej klatki. Cięcie krótsze niż klatka = „do decyzji”.
export function snapQuietest(cuts, words, energy, { fps, rate = 100, tolerance = 0.06, slack = 0.5 / fps }) {
  const end = energy.length / rate;
  const level = (t) => {
    const i = Math.round(t * rate);
    const near = [energy[i - 1], energy[i]].filter((x) => x != null);
    return near.length ? near.reduce((a, b) => a + b, 0) / near.length : Infinity;
  };
  const pick = (lo, hi, t) => {
    let best = null;
    for (let k = Math.ceil(lo * fps - 1e-9); k / fps <= Math.min(hi, end) + 1e-9; k++) {
      const x = k / fps;
      const e = level(x);
      if (!best || e < best.e - 1e-12 || (Math.abs(e - best.e) <= 1e-12 && Math.abs(x - t) < Math.abs(best.x - t))) best = { x, e };
    }
    return best?.x ?? null;
  };
  return cuts.map((c) => {
    const inner = words.filter((w) => w.start >= c.start - 1e-6 && w.end <= c.end + 1e-6);
    const before = words.filter((w) => w.end <= c.start + 1e-6 && !inner.includes(w)).at(-1)?.end ?? 0;
    const after = words.find((w) => w.start >= c.end - 1e-6 && !inner.includes(w))?.start ?? Infinity;
    const s = pick(Math.max(before - slack, c.start - tolerance), Math.min((inner[0]?.start ?? c.end) + slack, c.start + tolerance), c.start);
    const e = pick(Math.max((inner.at(-1)?.end ?? c.start) - slack, c.end - tolerance), Math.min(after + slack, c.end + tolerance), c.end);
    if (c.end - c.start < 1 / fps - 1e-9 || s == null || e == null || e - s < 1 / fps - 1e-9)
      return { ...c, decision: c.decision === "cut" ? "undecided" : c.decision, auto: false, reason: `${c.reason} · za mało miejsca na cięcie na klatce` };
    return { ...c, start: ms(s), end: ms(e) };
  });
}

// Średni poziom wypowiedzi (dB RMS) w 1 s przed i po wyciszeniu; ramki ciszy (< −50 dB) pomijane.
export function speechRms(rmsFrames, start, end) {
  const near = rmsFrames.filter(
    (f) => ((f.t >= start - 1 && f.t < start) || (f.t > end && f.t <= end + 1)) && f.db > -50,
  );
  return near.length ? ms(near.reduce((n, f) => n + f.db, 0) / near.length) : null;
}

const inside = (t, w) => t > w.start + 1e-6 && t < w.end - 1e-6;

export function validateCuts(cuts, words, { client } = {}) {
  const degraded = [];
  const degrade = (c, why) => {
    degraded.push({ id: c.id, why });
    return { ...c, decision: "undecided" };
  };
  let out = client === "skyclass" ? cuts.filter((c) => c.kind !== "silence" && c.kind !== "filler") : cuts;
  if (out.length < cuts.length) degraded.push({ id: "*", why: "SkyClass: bez cięcia ciszy i wtrąceń" });
  const isCut = (w) => out.some((c) => c.decision === "cut" && w.start >= c.start - 1e-6 && w.end <= c.end + 1e-6);
  out = out.map((c) => {
    if (c.decision !== "cut") return c;
    if (words.some((w) => inside(c.start, w) || inside(c.end, w))) return degrade(c, "cięcie w środku słowa");
    const covered = words.filter((w) => w.start >= c.start - 1e-6 && w.end <= c.end + 1e-6);
    for (const w of covered) {
      const i = words.indexOf(w);
      const prev = words[i - 1];
      const midCapital = prev && /^\p{Lu}/u.test(w.text) && !/[.!?…]$/.test(prev.text);
      if (!PROTECTED.has(bare(w.text)) && !/\d/.test(w.text) && !midCapital) continue;
      const kept = c.kind !== "silence" && c.kind !== "filler" &&
        words.some((x) => x.start >= c.end && x.start < c.end + 10 && bare(x.text) === bare(w.text) && !isCut(x));
      if (!kept) return degrade(c, `słowo chronione „${w.text}”`);
    }
    return c;
  });
  // Limit 35% wyciętego czasu w oknie 120 s: najpierw zdejmujemy najmniej pewne cięcia automatu.
  const win = 120;
  const windows = new Set(out.map((c) => Math.floor(c.start / win)));
  for (const k of windows) {
    const inWin = () => out.filter((c) => c.decision === "cut" && Math.floor(c.start / win) === k);
    const sum = () => inWin().reduce((n, c) => n + c.end - c.start, 0);
    const auto = inWin().filter((c) => c.auto).sort((a, b) => a.confidence - b.confidence);
    while (sum() > 0.35 * win && auto.length) {
      const victim = auto.shift();
      out = out.map((c) => (c === victim ? degrade(c, "limit 35% cięć w oknie 120 s") : c));
    }
  }
  return { cuts: out, report: { degraded } };
}

// ——— CLI ———
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeAtomic = (p, data) => {
  writeFileSync(`${p}.tmp`, JSON.stringify(data, null, 2) + "\n");
  renameSync(`${p}.tmp`, p);
};

// RMS co 0,1 s (ffmpeg astats) — argumenty i parser wspólne dla CLI (sync) i panelu (async).
export const rmsArgs = (file) => [
  "-hide_banner", "-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-af",
  "asetnsamples=1600,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
  "-f", "null", "-",
];
export function rmsFrames(file) {
  return parseRms(spawnSync("ffmpeg", rmsArgs(file), { encoding: "utf8", maxBuffer: 1 << 28 }).stdout);
}
export function parseRms(stdout) {
  const out = [];
  let t = 0;
  for (const line of stdout.split("\n")) {
    const pts = line.match(/pts_time:([\d.]+)/);
    if (pts) t = +pts[1];
    const v = line.match(/RMS_level=(-?[\d.]+|-inf)/);
    if (v) out.push({ t: t + 0.05, db: v[1] === "-inf" ? -120 : +v[1] });
  }
  return out;
}

// Propozycje + walidator + decyzje użytkowniczki z poprzedniego roughcut.json (wspólne dla CLI i panelu).
// Ręczna decyzja = auto: false z decyzją cut/keep (automat daje auto: false tylko przy „undecided”) albo własne cięcie `user-*`.
export function buildRoughCut({ words, duration, silences, client, lex, extraCuts = [], extraProfanity = [], prev = null, levelOf = null }) {
  const byId = new Map();
  for (const c of [
    ...silenceCuts(silences, words),
    ...fillerCuts(words, lex.fillers, voicedGaps(silences, words, duration)),
    ...extraCuts,
  ])
    if (!byId.has(c.id)) byId.set(c.id, c);
  const { cuts, report } = validateCuts([...byId.values()].sort((a, b) => a.start - b.start), words, { client });
  // Leksykon + przekleństwa wskazane przez model w kontekście (np. „je...” z Whispera).
  const flagged = new Set(extraProfanity);
  let mutes = censorMutes(words, { ...lex.profanity, extra: flagged });
  if (mutes.length && levelOf) mutes = mutes.map((m) => ({ ...m, level: levelOf(m) }));
  const manual = new Map(
    (prev?.cuts ?? [])
      .filter((c) => c.id.startsWith("user-") || (!c.auto && c.decision !== "undecided"))
      .map((c) => [c.id, c]),
  );
  const merged = cuts.map((c) => (manual.has(c.id) ? { ...c, decision: manual.get(c.id).decision, auto: false } : c));
  const custom = [...manual.values()].filter((c) => !merged.some((x) => x.id === c.id));
  const doc = RoughCut.parse({
    version: 1,
    sourceDuration: duration,
    cuts: [...merged, ...custom].sort((a, b) => a.start - b.start),
    mutes,
  });
  return { doc, report };
}

export const loadLexicons = (root = ROOT) => ({
  fillers: readJson(path.join(root, "src/longform/fillers-pl.json")),
  profanity: readJson(path.join(root, "src/longform/profanity-pl.json")),
});

export const probeDuration = (src) =>
  +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], { encoding: "utf8" });

export const sourceSilences = (src, duration) =>
  detectSilences(src).map((s) => ({ start: s.start, end: s.end ?? duration }));

export const levelsFrom = (src) => {
  let frames = null;
  return (m) => speechRms((frames ??= rmsFrames(src)), m.start, m.end);
};

export const hasSfx = (id, root = ROOT) => {
  const file = path.join(root, "public/sfx/index.json");
  return existsSync(file) && readJson(file).some((x) => x.id === id && existsSync(path.join(root, "public/sfx", x.file)));
};

function propose(name) {
  const dir = path.join(ROOT, "public/reels", name);
  const reel = readJson(path.join(dir, "reel.json"));
  const src = path.join(dir, reel.source);
  const t = readJson(path.join(dir, "transcript.json"));
  const words = timedWords((Array.isArray(t) ? t : t.words).map((w, i) => ({ ...w, id: w.id ?? `w${i}` })));
  const duration = probeDuration(src);
  const file = path.join(dir, "roughcut.json");
  const { doc, report } = buildRoughCut({
    words,
    duration,
    silences: sourceSilences(src, duration),
    client: reel.client,
    lex: loadLexicons(),
    prev: existsSync(file) ? readJson(file) : null,
    levelOf: levelsFrom(src),
  });
  writeAtomic(file, doc);
  const n = (d) => doc.cuts.filter((c) => c.decision === d).length;
  console.log(`roughcut.json: ${n("cut")} cięć, ${n("undecided")} do decyzji, ${doc.mutes.length} wyciszeń`);
  for (const d of report.degraded) console.log(`  zdegradowane ${d.id}: ${d.why}`);
  if (doc.mutes.length && !hasSfx("kruk"))
    console.warn("Uwaga: brak dźwięku „kruk” w public/sfx/index.json — cenzura zadziała jako samo wyciszenie.");
}

function apply(name) {
  const dir = path.join(ROOT, "public/reels", name);
  const doc = RoughCut.parse(readJson(path.join(dir, "roughcut.json")));
  const reelFile = path.join(dir, "reel.json");
  const reel = readJson(reelFile);
  reel.segments = applyDecisions(doc.sourceDuration, doc.cuts);
  reel.mutes = doc.mutes;
  writeAtomic(reelFile, reel);
  console.log(`reel.json: ${reel.segments.length} segmentów, ${reel.mutes.length} wyciszeń`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, name] = process.argv.slice(2);
  if (!name || !["propose", "apply"].includes(cmd)) {
    console.error("Użycie: node scripts/longform-roughcut.mjs propose|apply <rolka>");
    process.exit(1);
  }
  (cmd === "propose" ? propose : apply)(name);
}
