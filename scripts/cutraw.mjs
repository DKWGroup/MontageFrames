#!/usr/bin/env node
// CutRaw: projekt → przetwarzanie → paczka XML dla Premiere (zalozenia-funkcji-CutRaw.md). Te same funkcje woła panel (ui/cutraw-server.mjs).
// C3: przełączanie kamer (cutraw-angles.mjs, pole `shows` kamery), dryf zegara (`sync.k`, `sync.at`), markery i link w XML.
//   npm run cutraw -- new <nazwa> <plik…> [--ref <kamera>] [--client <klient>] [--force]
//   npm run cutraw -- process <nazwa> [--pace spokojne|standard|gęste] [--ai openai|claude|codex|none] [--keep-head 1-3] [--keep-tail 0|1] [--proxy]
//   npm run cutraw -- export <nazwa>
// Czasy w czasie mastera (kamera referencyjna); czas pliku = master − offset. Oryginałów nie kopiujemy ani nie zmieniamy.
import { createHash } from "node:crypto";
import console from "node:console";
import process from "node:process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { clientOf, NOISE_DB } from "./prep.mjs";
import { applyDecisions, censorMutes, fillerCuts, loadLexicons, PACE, silenceCuts, snapQuietest, timedWords, validateCuts, voicedGaps } from "./longform-roughcut.mjs";
import { hashFile, runMediaTool } from "./quickcontent-ingest.mjs";
import { transcribeSource } from "./quickcontent-transcribe.mjs";
import { probe, syncFiles } from "./cutraw-sync.mjs";
import { masterLevels, mixArgs, renderMasterWav } from "./cutraw-audio.mjs";
import { LUNA, lunaCuts } from "./cutraw-ai.mjs";
import { rateOf, toXmeml } from "./cutraw-xml.mjs";
import { cameraPlan, defaultAngles } from "./cutraw-angles.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const AI = ["openai", "claude", "codex", "none"];
export const dirOf = (name) => path.join(ROOT, "public/cutraw", name);
const rel = (p) => path.relative(ROOT, p);
const KINDS = ["silence", "filler", "false-start", "retake", "repetition", "offtopic", "manual"];

export const CutRawCut = z
  .looseObject({
    id: z.string().min(1),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    wordIds: z.array(z.string()),
    kind: z.enum(KINDS),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
    auto: z.boolean(),
    decision: z.enum(["cut", "keep", "undecided"]),
  })
  .refine((c) => c.start < c.end, { message: "start musi być < end" });
export const CutRawMute = z
  .looseObject({ wordId: z.string().min(1), start: z.number().nonnegative(), end: z.number().nonnegative(), ramp: z.number().nonnegative() })
  .refine((m) => m.start < m.end, { message: "start musi być < end" });
const Source = z.looseObject({
  id: z.string(),
  role: z.enum(["camera", "mic"]),
  label: z.string(),
  path: z.string(),
  duration: z.number().positive(),
  video: z.looseObject({ width: z.number(), height: z.number(), fps: z.string() }).nullable(),
  audio: z.looseObject({ channels: z.number(), sampleRate: z.number() }).nullable(),
  fingerprint: z.string(),
  offset: z.number().optional(),
});
const Project = z.looseObject({
  version: z.literal(1),
  name: z.string(),
  client: z.string().nullable(),
  reference: z.string(),
  fps: z.string(),
  width: z.number(),
  height: z.number(),
  duration: z.number().positive(),
  sources: z.array(Source).min(1),
  settings: z.object({
    pace: z.enum(Object.keys(PACE)),
    ai: z.enum(AI),
    censor: z.object({ keepHead: z.number().int().min(1).max(3), keepTail: z.number().int().min(0).max(1) }),
  }),
  cuts: z.array(CutRawCut),
  mutes: z.array(CutRawMute),
  revision: z.number().int(),
});

// Odcisk pliku bez czytania całości (2 h 4K): rozmiar + sha256 pierwszego i ostatniego MB.
export function fingerprint(file) {
  const { size } = statSync(file);
  const buf = Buffer.alloc(Math.min(size, 1 << 20));
  const h = createHash("sha256");
  const fd = openSync(file, "r");
  try {
    for (const at of [0, size - buf.length]) h.update(buf.subarray(0, readSync(fd, buf, 0, buf.length, at)));
  } finally {
    closeSync(fd);
  }
  return `${size}:${h.digest("hex").slice(0, 24)}`;
}

export function loadProject(name) {
  const file = path.join(dirOf(name), "cutraw.json");
  if (!existsSync(file)) throw Object.assign(new Error(`Brak projektu ${name}.`), { status: 404 });
  const p = Project.parse(JSON.parse(readFileSync(file, "utf8")));
  // Kogo pokazuje kamera (C3): brak zapisu = domyślne przypisanie (projekty sprzed C3 też).
  const cams = camerasOf(p);
  if (cams.some((c) => c.shows === undefined)) {
    const def = defaultAngles(cams.map((c) => c.id), p.sources.filter((x) => x.role === "mic").map((x) => x.id));
    for (const c of cams) if (c.shows === undefined) c.shows = def[c.id];
  }
  return p;
}
// Kamera główna pierwsza, dalej pozostałe w kolejności dodania.
const camerasOf = (p) => [...p.sources.filter((s) => s.id === p.reference), ...p.sources.filter((s) => s.role === "camera" && s.id !== p.reference)];
// Zegar źródła: offset w chwili `at` mastera + dryf k (s/s). Bez dryfu k = 0.
export const clock = (s) => ({ offset: s.offset ?? 0, k: s.sync?.k ?? 0, at: s.sync?.at ?? 0 });
function save(p) {
  const file = path.join(dirOf(p.name), "cutraw.json");
  writeFileSync(`${file}.tmp`, JSON.stringify(p, null, 2) + "\n");
  renameSync(`${file}.tmp`, file);
}
function checkSources(p) {
  for (const s of p.sources) {
    if (!existsSync(s.path)) throw new Error(`Brak pliku źródła: ${s.path}`);
    if (fingerprint(s.path) !== s.fingerprint) throw new Error(`Plik źródła zmienił się od utworzenia projektu: ${s.path}`);
  }
}

// Mówca słowa = źródło mowy z największą energią w czasie słowa (ramki 10 ms mastera).
export function speakerOf(w, levels, labels) {
  if (labels.length < 2) return labels[0] ?? null;
  const a = Math.floor(w.start * 100);
  const b = Math.max(a + 1, Math.ceil(w.end * 100));
  let best = 0;
  let max = -1;
  levels.forEach((lv, i) => {
    let e = 0;
    for (let k = a; k < b; k++) e += lv[k] ?? 0;
    if (e > max) [best, max] = [i, e];
  });
  return labels[best];
}

// applyDecisions odrzuca zachowane kawałki < 0,15 s — taki kawałek nie może zabrać słowa: późniejsze cięcie wraca do decyzji.
export function guardShortKeeps(cuts, words, duration) {
  const on = cuts.filter((c) => c.decision === "cut").sort((a, b) => a.start - b.start);
  const drop = new Set();
  let t = 0;
  for (const c of on) {
    const gap = c.start - t;
    if (gap > 0 && gap < 0.15 && words.some((w) => w.start >= t - 1e-6 && w.end <= c.start + 1e-6)) drop.add(c.id);
    t = Math.max(t, c.end);
  }
  const tail = duration - t;
  if (on.length && tail > 0 && tail < 0.15 && words.some((w) => w.start >= t - 1e-6)) drop.add(on.at(-1).id);
  return cuts.map((c) => (drop.has(c.id) ? { ...c, decision: "undecided", auto: false, reason: `${c.reason} · zostawiłoby za krótki fragment ze słowem` } : c));
}

export function nextVersion(base, name) {
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-cutraw-v(\\d{3})$`);
  const used = existsSync(base) ? readdirSync(base).map((f) => +(f.match(re)?.[1] ?? 0)) : [];
  return Math.max(0, ...used) + 1;
}

const KIND_PL = { silence: "cisza", filler: "„yyy”", "false-start": "falstart", retake: "dubel", repetition: "powtórzenie", offtopic: "dygresja", manual: "własne cięcie" };

// Markery w XML: miejsca „do decyzji” i treść, którą Luna kazała zostawić (bez ciszy i „yyy” — tego byłoby za dużo).
export const markersOf = (cuts) =>
  cuts
    .filter((c) => c.decision === "undecided" || (c.decision === "keep" && c.luna?.verdict === "keep" && !["silence", "filler"].includes(c.kind)))
    .map((c) => ({
      at: c.start,
      name: `${c.decision === "undecided" ? "Do decyzji" : "Luna zostawiła"}: ${KIND_PL[c.kind] ?? c.kind}`,
      comment: c.luna?.reason ?? c.reason,
    }));

// Układ osi Premiere. Z przełączaniem (≥ 2 kamery z przypisanym mówcą): V1 = montaż kamer, wyżej wszystkie kamery (wyłączone)
// do ręcznej podmiany. Bez: V1 kamera główna, wyżej pozostałe (wyłączone). A: mowa w czasie mastera, dalej wyłączone oryginały.
// Obraz kamery i jej dźwięk są powiązane (`link`).
export function timeline(p, speechFiles, { words = [], segments = [] } = {}) {
  const cams = camerasOf(p);
  const fileOf = (s) => ({ id: s.id, path: s.path, duration: s.duration, width: s.video?.width, height: s.video?.height, channels: s.audio?.channels, sampleRate: s.audio?.sampleRate });
  const labelOf = (id) => p.sources.find((s) => s.id === id)?.label;
  const ref = cams[0];
  const shots = cameraPlan({
    words,
    segments,
    duration: p.duration,
    cameras: cams.map((c) => ({ id: c.id, shows: c.shows === "wide" ? "wide" : (labelOf(c.shows) ?? null) })),
  });
  const cam = (s) => ({ file: s.id, ...clock(s), label: s.label });
  return {
    name: p.name,
    fps: p.fps,
    width: p.width,
    height: p.height,
    shots,
    markers: markersOf(p.cuts),
    files: [...p.sources.map(fileOf), ...speechFiles],
    video: [
      ...(shots ? [{ shots: shots.map((x) => cam(p.sources.find((s) => s.id === x.camera))).map((c, i) => ({ ...c, start: shots[i].start, end: shots[i].end })), fallback: cam(ref) }] : []),
      ...cams.map((s) => ({ ...cam(s), enabled: !shots && s === ref, link: s.id })),
    ],
    audio: [
      ...speechFiles.map((f) => ({ file: f.id, offset: 0, label: f.label })),
      ...p.sources.filter((s) => s.role === "mic").map((s) => ({ ...cam(s), enabled: false, label: `${s.label} (oryginał)` })),
      ...cams.filter((s) => s.audio).map((s) => ({ ...cam(s), enabled: false, label: `${s.label} (audio kamery)`, link: s.id })),
    ],
  };
}

export const plural = (n, one, few, many) =>
  `${n} ${n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many}`;
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;

// Energia 10 ms → dB co 0,1 s do osi źródeł w panelu.
export const displayLevels = (energy) =>
  Array.from({ length: Math.ceil(energy.length / 10) }, (_, i) => {
    let s = 0;
    let n = 0;
    for (let k = i * 10; k < Math.min(energy.length, i * 10 + 10); k++, n++) s += energy[k];
    return Math.max(-90, Math.round(10 * Math.log10(s / Math.max(1, n) + 1e-10)));
  });

// Cisza z FFmpeg asynchronicznie — w panelu długi plik nie blokuje serwera (postęp dalej się odświeża).
async function silencesOf(file, duration, minSilence = 0.1) {
  const { stderr } = await runMediaTool("ffmpeg", ["-hide_banner", "-i", file, "-af", `silencedetect=noise=${NOISE_DB}dB:d=${minSilence}`, "-f", "null", "-"]);
  const out = [];
  for (const m of String(stderr).matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === "start") out.push({ start: +m[2], end: duration });
    else if (out.length) out.at(-1).end = +m[2];
  }
  return out;
}

const proxyArgs = (video, audio, out, encoder) => [
  "-hide_banner", "-v", "error", "-y", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0",
  "-vf", "scale=-2:720", "-pix_fmt", "yuv420p",
  ...(encoder === "h264_videotoolbox" ? ["-c:v", encoder, "-b:v", "2500k"] : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "30"]),
  "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out,
];

export async function createProject(name, files, { ref, client, force } = {}) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name ?? "")) throw Object.assign(new Error("Nazwa projektu: małe litery, cyfry i myślniki."), { status: 400 });
  if (!files.length) throw Object.assign(new Error("Wybierz pliki kamer i mikrofonów."), { status: 400 });
  const dir = dirOf(name);
  if (existsSync(path.join(dir, "cutraw.json")) && !force) throw Object.assign(new Error(`Projekt ${name} już istnieje.`), { status: 409 });
  const sources = [];
  const n = { camera: 0, mic: 0 };
  for (const f of files) {
    const abs = path.resolve(f);
    if (!existsSync(abs)) throw Object.assign(new Error(`Brak pliku: ${f}`), { status: 400 });
    const info = await probe(abs);
    const role = info.video ? "camera" : "mic";
    if (!info.audio) throw Object.assign(new Error(`${path.basename(abs)}: brak ścieżki audio — bez niej nie da się zsynchronizować.`), { status: 400 });
    sources.push({ id: `${role === "camera" ? "kamera" : "mikrofon"}-${++n[role]}`, role, label: path.parse(abs).name, path: abs, ...info, fingerprint: fingerprint(abs) });
  }
  const refSrc = ref ? sources.find((s) => s.path === path.resolve(ref)) : sources.find((s) => s.role === "camera");
  if (!refSrc || refSrc.role !== "camera")
    throw Object.assign(new Error("CutRaw potrzebuje kamery głównej (pliku wideo z dźwiękiem)."), { status: 400 });
  const who = client ?? clientOf(rel(refSrc.path)) ?? null;
  if (who && !existsSync(path.join(ROOT, "klienci", who))) throw Object.assign(new Error(`Nieznany klient: ${who}`), { status: 400 });
  const warnings = [];
  for (const s of sources.filter((x) => x.role === "camera")) {
    if (s.video.fps !== refSrc.video.fps) warnings.push(`${s.label}: ${s.video.fps} fps zamiast ${refSrc.video.fps} — Premiere przeliczy klatki.`);
    if (s.video.vfr) warnings.push(`${s.label}: zmienna liczba klatek (VFR) — możliwy dryf obrazu.`);
  }
  mkdirSync(dir, { recursive: true });
  const p = Project.parse({
    version: 1, name, client: who, reference: refSrc.id, fps: refSrc.video.fps, width: refSrc.video.width, height: refSrc.video.height,
    duration: refSrc.duration, sources, settings: { pace: "standard", ai: "openai", censor: { keepHead: 2, keepTail: 0 } },
    cuts: [], mutes: [], warnings, usage: [], exports: [], revision: 1, createdAt: new Date().toISOString(),
  });
  save(p);
  return p;
}

// report({ stage, progress, detail }) — postęp dla CLI i panelu; progress 0–1 tylko, gdy mierzony.
export async function processProject(name, opt = {}, { report = () => {}, panel = false } = {}) {
  const p = loadProject(name);
  checkSources(p);
  if (opt.pace) p.settings.pace = opt.pace;
  if (opt.ai) p.settings.ai = opt.ai;
  if (opt.keepHead) p.settings.censor.keepHead = +opt.keepHead;
  if (opt.keepTail != null) p.settings.censor.keepTail = +opt.keepTail;
  Project.parse(p);
  const dir = dirOf(name);
  const warnings = p.warnings.filter((w) => !w.startsWith("GPT-6 Luna") && !w.startsWith("Synchronizacja"));
  const fps = rateOf(p.fps).real;
  const step = (stage, detail, progress = null) => report({ stage, detail, progress });

  step("sync", "Synchronizacja po dźwięku");
  const ref = p.sources.find((s) => s.id === p.reference);
  ref.offset = 0;
  // Ręcznie przesunięte źródło zostaje z offsetem użytkowniczki.
  const auto = p.sources.filter((s) => s !== ref && !s.sync?.manual);
  for (const [i, r] of (auto.length ? await syncFiles(ref.path, auto.map((s) => s.path)) : []).entries()) {
    const s = auto[i];
    s.offset = r.offset;
    // Dryf > ½ klatki między oknem z początku i końca → korekta: offset rośnie liniowo, punkt zaczepienia w środkowym oknie
    // (tam offset jest doprecyzowany co do próbki). Audio przepróbkowane do zegara mastera, obraz przesuwany per klip.
    const [w0, w1, w2] = r.windows;
    const k = Math.abs(r.drift) > 0.5 / fps && w2.at > w0.at ? Math.round(((w2.offset - w0.offset) / (w2.at - w0.at)) * 1e9) / 1e9 : 0;
    s.sync = { score: r.score, r: r.r, confident: r.confident, drift: r.drift, method: r.method, ...(k ? { k, at: w1.at } : {}) };
    step("sync", `${s.label}: ${r.offset} s${r.confident ? "" : " — do sprawdzenia"}`, (i + 1) / auto.length);
    if (!r.confident) warnings.push(`Synchronizacja „${s.label}” do sprawdzenia (score ${r.score}, r ${r.r}).`);
    if (k) warnings.push(`Synchronizacja „${s.label}”: dryf zegara ${r.drift} s (${Math.round(k * 1e6)} ppm) — skorygowany.`);
  }

  step("levels", "Miks mowy i poziomy mikrofonów");
  const speech = p.sources.filter((s) => s.role === "mic");
  if (!speech.length) speech.push(ref);
  const mix = path.join(dir, "mix.wav");
  await runMediaTool("ffmpeg", mixArgs(speech.map((s) => ({ path: s.path, ...clock(s) })), mix, p.duration));
  const levels = [];
  for (const s of speech) levels.push(await masterLevels(s.path, { ...clock(s), duration: p.duration }));
  const energy = levels[0].map((_, k) => levels.reduce((n, lv) => n + (lv[k] ?? 0), 0));

  step("transcribe", "Transkrypcja (Whisper, lokalnie)", 0);
  const t = await transcribeSource(
    { hash: await hashFile(mix), dataDir: `${rel(dir)}/.whisper`, masterPath: rel(mix), duration: p.duration },
    {},
    {
      root: ROOT,
      report: ({ completedUnits, totalUnits }) => {
        if (totalUnits) step("transcribe", "Transkrypcja (Whisper, lokalnie)", completedUnits / totalUnits);
      },
    },
  );
  const labels = speech.map((s) => (s.role === "mic" ? s.label : null)).filter(Boolean);
  const words = timedWords(t.words.map((w, i) => ({ id: `w${i}`, text: w.text, start: w.start, end: w.end }))).map((w) => ({ ...w, speaker: speakerOf(w, levels, labels) }));
  if (!words.length) throw new Error("Whisper nie znalazł mowy w nagraniu.");
  writeFileSync(path.join(dir, "transcript.json"), JSON.stringify(words) + "\n");

  step("detect", "Cisza, „yyy” i wtrącenia");
  const pace = PACE[p.settings.pace];
  const silences = await silencesOf(mix, p.duration);
  const lex = loadLexicons(ROOT);
  const det = [...silenceCuts(silences, words, pace), ...fillerCuts(words, lex.fillers, voicedGaps(silences, words, p.duration))];

  let cuts = null;
  let profanity = [];
  let review = {};
  const usage = [];
  if (p.settings.ai !== "none") {
    step("ai", `Redakcja i kontrola sensu (${p.settings.ai === "openai" ? LUNA : p.settings.ai})`);
    const clientRules = p.client ? readFileSync(path.join(ROOT, "klienci", p.client, "PREFERENCJE.md"), "utf8").slice(0, 6000) : "";
    const ctx = { root: ROOT, aiProvider: p.settings.ai, aiModel: p.settings.ai === "openai" ? LUNA : undefined, recordUsage: (u) => usage.push(u) };
    try {
      ({ cuts, profanity, report: review } = await lunaCuts(words, det, ctx, { client: p.client, clientRules }));
    } catch (e) {
      warnings.push(`GPT-6 Luna / operator AI: ${e.message} Zostały cięcia bez AI (cisza i „yyy”); falstarty i dubli nie są wykryte.`);
    }
  }
  if (!cuts) ({ cuts, report: review } = validateCuts(det.sort((a, b) => a.start - b.start), words, { client: p.client }));

  step("snap", "Najcichsza klatka i cenzura");
  // Ręczne decyzje i własne cięcia przeżywają ponowne przetwarzanie (jak w LongForm).
  const manual = new Map(p.cuts.filter((c) => c.id.startsWith("user-") || (!c.auto && c.decision !== "undecided")).map((c) => [c.id, c]));
  cuts = cuts.map((c) => (manual.has(c.id) ? { ...c, decision: manual.get(c.id).decision, auto: false } : c));
  cuts.push(...[...manual.values()].filter((c) => !cuts.some((x) => x.id === c.id)));
  cuts = snapQuietest(cuts.sort((a, b) => a.start - b.start), words, energy, { fps });
  cuts = guardShortKeeps(cuts, words, p.duration);
  const en = JSON.parse(readFileSync(path.join(ROOT, "src/longform/profanity-en.json"), "utf8"));
  const mutes = censorMutes(
    words,
    { stems: [...lex.profanity.stems, ...en.stems], except: [...lex.profanity.except, ...en.except], extra: new Set(profanity) },
    { ...p.settings.censor, sfx: null },
  );

  if (panel) {
    step("preview", "Fale dźwięku do osi źródeł");
    const display = {};
    for (const s of p.sources) {
      const i = speech.indexOf(s);
      display[s.id] = displayLevels(i >= 0 ? levels[i] : await masterLevels(s.path, { ...clock(s), duration: p.duration }));
    }
    writeFileSync(path.join(dir, "levels.json"), JSON.stringify({ rate: 10, sources: display }) + "\n");
    const key = `${ref.fingerprint}|${speech.map((s) => `${s.id}:${s.offset}:${s.sync?.k ?? 0}`).join(",")}`;
    const proxy = path.join(dir, "proxy.mp4");
    if (p.proxyKey !== key || !existsSync(proxy)) {
      step("preview", "Podgląd 720p do przeglądu cięć");
      const tmp = path.join(dir, "proxy.tmp.mp4");
      await runMediaTool("ffmpeg", proxyArgs(ref.path, mix, tmp, process.platform === "darwin" ? "h264_videotoolbox" : "libx264")).catch(() =>
        runMediaTool("ffmpeg", proxyArgs(ref.path, mix, tmp, "libx264")),
      );
      renameSync(tmp, proxy);
      p.proxyKey = key;
    }
  }

  Object.assign(p, {
    speech: speech.map((s) => s.id),
    cuts,
    mutes,
    warnings,
    stale: undefined,
    report: { degraded: review.degraded ?? [], rejected: review.rejected?.length ?? 0, verified: review.verified ?? 0 },
    usage: [...p.usage, ...usage],
    revision: p.revision + 1,
    processedAt: new Date().toISOString(),
  });
  save(Project.parse(p));
  const on = cuts.filter((c) => c.decision === "cut");
  return {
    project: p,
    cuts: on.length,
    kinds: Object.entries(Object.groupBy(on, (c) => c.kind)).map(([k, v]) => `${k} ${v.length}`).join(", "),
    undecided: cuts.filter((c) => c.decision === "undecided").length,
    mutes: mutes.length,
    kept: applyDecisions(p.duration, cuts).reduce((n, s) => n + s.end - s.start, 0),
    usage,
  };
}

// Decyzje z przeglądu (panel): cięcia i wyciszenia, rewizja chroni przed nadpisaniem nowszej wersji.
export function saveCuts(name, revision, { cuts, mutes }) {
  const p = loadProject(name);
  if (revision !== p.revision) throw Object.assign(new Error("Cięcia zmieniły się w innym oknie — odśwież."), { status: 409 });
  const next = Project.safeParse({ ...p, cuts, mutes, revision: p.revision + 1 });
  if (!next.success) throw Object.assign(new Error("Nieprawidłowe cięcia albo wyciszenia."), { status: 400 });
  save(next.data);
  return next.data;
}

// Ręczne przesunięcie synchronizacji (±1 klatka). Kamera bez roli mowy działa od razu; mikrofon wymaga ponownego przetwarzania.
export function nudgeSync(name, revision, sourceId, delta) {
  const p = loadProject(name);
  if (revision !== p.revision) throw Object.assign(new Error("Projekt zmienił się w innym oknie — odśwież."), { status: 409 });
  const s = p.sources.find((x) => x.id === sourceId);
  if (!s || s.id === p.reference) throw Object.assign(new Error("Kamery głównej nie przesuwa się — to ona wyznacza czas."), { status: 400 });
  if (!Number.isFinite(delta) || Math.abs(delta) > 5) throw Object.assign(new Error("Nieprawidłowe przesunięcie."), { status: 400 });
  s.offset = Math.round(((s.offset ?? 0) + delta) * 1e5) / 1e5;
  s.sync = { ...s.sync, manual: true };
  const stale = (p.speech ?? []).includes(s.id);
  Object.assign(p, { revision: p.revision + 1, ...(stale ? { stale: "Zmieniono synchronizację mowy — przetwórz ponownie, żeby cięcia i audio się zgadzały." } : {}) });
  save(p);
  return p;
}

// Kogo pokazuje kamera: "wide" (plan ogólny), id mikrofonu albo null (nie bierze udziału w przełączaniu). Wpływa tylko na eksport.
export function setAngle(name, revision, cameraId, shows) {
  const p = loadProject(name);
  if (revision !== p.revision) throw Object.assign(new Error("Projekt zmienił się w innym oknie — odśwież."), { status: 409 });
  const s = p.sources.find((x) => x.id === cameraId && x.role === "camera");
  const ok = shows === null || shows === "wide" || p.sources.some((x) => x.id === shows && x.role === "mic");
  if (!s || !ok) throw Object.assign(new Error("Nieprawidłowa kamera albo osoba."), { status: 400 });
  s.shows = shows;
  p.revision += 1;
  save(p);
  return p;
}

export async function exportProject(name, { report = () => {} } = {}) {
  const p = loadProject(name);
  checkSources(p);
  if (!p.processedAt) throw Object.assign(new Error("Najpierw przetwórz nagranie."), { status: 409 });
  if (p.stale) throw Object.assign(new Error(p.stale), { status: 409 });
  const segments = applyDecisions(p.duration, p.cuts);
  const base = p.client ? path.join(ROOT, "klienci", p.client, "Render") : path.join(ROOT, "out");
  const v = nextVersion(base, name);
  const tag = `v${String(v).padStart(3, "0")}`;
  const pkg = path.join(base, `${name}-cutraw-${tag}`);
  mkdirSync(path.join(pkg, "audio"), { recursive: true });
  const speechFiles = [];
  for (const [i, id] of p.speech.entries()) {
    const s = p.sources.find((x) => x.id === id);
    const out = path.join(pkg, "audio", `${s.label.replace(/[/\\:\0]/g, "-")} — mowa${p.mutes.length ? " (cenzura)" : ""}.wav`);
    report({ stage: "export", detail: `Audio mowy: ${s.label}`, progress: i / (p.speech.length + 1) });
    await renderMasterWav(s.path, out, { ...clock(s), duration: p.duration, mutes: p.mutes });
    speechFiles.push({ id: `mowa-${s.id}`, path: out, duration: p.duration, channels: 1, sampleRate: 48000, label: `${s.label} — mowa` });
  }
  report({ stage: "export", detail: "XML dla Premiere", progress: p.speech.length / (p.speech.length + 1) });
  const words = JSON.parse(readFileSync(path.join(dirOf(name), "transcript.json"), "utf8"));
  const tl = timeline(p, speechFiles, { words, segments });
  writeFileSync(path.join(pkg, `${name}.xml`), toXmeml({ ...tl, segments }));
  const kept = segments.reduce((n, s) => n + s.end - s.start, 0);
  const sync = p.sources
    .filter((s) => s.id !== p.reference)
    .map((s) => `  ${s.label}: ${s.offset} s${s.sync?.k ? ` (dryf ${Math.round(s.sync.k * 1e6)} ppm, skorygowany)` : ""}${s.sync?.manual ? " (ręcznie)" : s.sync?.confident === false ? " — DO SPRAWDZENIA" : ""}`);
  writeFileSync(
    path.join(pkg, "README.txt"),
    [
      `CutRaw — ${p.name} (${tag}), ${new Date().toLocaleDateString("sv-SE")}`,
      "",
      `Premiere Pro: Plik → Importuj → ${name}.xml. Klipy wskazują oryginalne pliki (nie przenoś ich) i folder audio/ obok tego pliku.`,
      tl.shots
        ? `V1: montaż kamer na mówiącego (${plural(tl.shots.length, "ujęcie", "ujęcia", "ujęć")}). Wyżej wszystkie kamery — wyłączone, zsynchronizowane: podmień ujęcie, kopiując klip z wyższej ścieżki.`
        : `V1: ${p.sources.find((s) => s.id === p.reference).label} (włączona). Wyżej pozostałe kamery — wyłączone, zsynchronizowane.`,
      ...(tl.markers.length ? [`Markery: ${plural(tl.markers.length, "miejsce", "miejsca", "miejsc")} do sprawdzenia (do decyzji i to, co Luna zostawiła) — okno Markery.`] : []),
      "A1…: mowa w czasie kamery głównej, wyrównana co do próbki" + (p.mutes.length ? `, z cenzurą (${plural(p.mutes.length, "wyciszenie", "wyciszenia", "wyciszeń")})` : "") + ". Dalej oryginalne audio — wyłączone, wyrównane do klatki.",
      "Cięcia są twarde, w najcichszej klatce. Miękkie przejścia: zaznacz klipy audio → Sekwencja → Zastosuj domyślne przejścia do zaznaczenia.",
      "",
      `Fragmenty: ${segments.length}, po cięciach ${mmss(kept)} z ${mmss(p.duration)}.`,
      ...(sync.length ? ["Synchronizacja (offset = czas kamery głównej − czas pliku):", ...sync] : []),
      ...(p.warnings.length ? ["", "Uwagi:", ...p.warnings.map((w) => `  ${w}`)] : []),
      "",
    ].join("\n"),
  );
  checkSources(p);
  const record = { version: v, tag, dir: rel(pkg), xml: rel(path.join(pkg, `${name}.xml`)), at: new Date().toISOString(), segments: segments.length, shots: tl.shots?.length ?? 0, markers: tl.markers.length, duration: Math.round(kept * 1000) / 1000, revision: p.revision };
  p.exports = [...(p.exports ?? []), record];
  save(p);
  return record;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      ref: { type: "string" }, client: { type: "string" }, force: { type: "boolean" }, proxy: { type: "boolean" },
      pace: { type: "string" }, ai: { type: "string" }, "keep-head": { type: "string" }, "keep-tail": { type: "string" },
    },
  });
  const [cmd, name, ...files] = positionals;
  const say = (msg) => console.log(msg);
  if (cmd === "new") {
    const p = await createProject(name, files, values);
    say(`Projekt ${name}: ${p.sources.map((s) => `${s.label} (${s.role === "camera" ? "kamera" : "mikrofon"})`).join(", ")}; referencja: ${p.sources.find((s) => s.id === p.reference).label}${p.client ? `; klient: ${p.client}` : ""}.`);
    for (const w of p.warnings) say(`Uwaga: ${w}`);
    return;
  }
  if (cmd === "process") {
    let last = "";
    const r = await processProject(
      name,
      { pace: values.pace, ai: values.ai, keepHead: values["keep-head"], keepTail: values["keep-tail"] },
      {
        panel: values.proxy,
        report: ({ detail, progress }) => {
          const line = progress != null && detail.startsWith("Transkrypcja") ? `${detail} ${Math.floor(progress * 20) * 5}%` : detail;
          if (line !== last) say((last = line));
        },
      },
    );
    const cost = r.usage.length ? (r.usage.some((u) => u.costMicroUsd == null) ? "brak pełnych danych o koszcie" : `${(r.usage.reduce((n, u) => n + u.costMicroUsd, 0) / 1e6).toFixed(4)} USD`) : null;
    say(`Gotowe: ${plural(r.cuts, "cięcie", "cięcia", "cięć")} (${r.kinds || "brak"}), ${r.undecided} do decyzji, ${plural(r.mutes, "wyciszenie", "wyciszenia", "wyciszeń")}.`);
    say(`Po cięciach ${mmss(r.kept)} z ${mmss(r.project.duration)}.${cost ? ` Koszt AI: ${cost} (${plural(r.usage.length, "zapytanie", "zapytania", "zapytań")}).` : ""}`);
    for (const w of r.project.warnings) say(`Uwaga: ${w}`);
    return say(`Dalej: npm run cutraw -- export ${name}`);
  }
  if (cmd === "export") {
    const r = await exportProject(name, { report: ({ detail }) => say(detail) });
    return say(`Paczka ${r.tag}: ${r.dir}`);
  }
  throw new Error("Użycie: npm run cutraw -- new|process|export <nazwa> … (zob. nagłówek scripts/cutraw.mjs)");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
