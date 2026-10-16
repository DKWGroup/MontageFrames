// LongForm w panelu: projekt = folder rolki (public/reels/<nazwa>/), stan w longform.json.
// „Przetwarzaj”: probe → Whisper → cisza/RMS → redakcja AI → walidator → roughcut.json → awaiting-cut-review.
// Montaż efektowy dopiero po „Zatwierdź cięcia” (L3). Ciężki job dzieli blokadę z QuickContent.
import { Buffer } from "node:buffer";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseEnv, promisify } from "node:util";
import { applyDecisions, buildRoughCut, hasSfx, loadLexicons, parseRms, rmsArgs, speechRms } from "../scripts/longform-roughcut.mjs";
import { editRoughCut, lfProvider, requestPlan } from "../scripts/longform-ai.mjs";
import { fetchBroll, logoFor } from "../scripts/longform-assets.mjs";
import { buildMask } from "../scripts/longform-mask.mjs";
import { CATALOG, effectSpan, minDuration, planToReel, validateChapters, validateColdOpen, validateHooks, validatePlan, youtubeChapters } from "../scripts/longform-plan.mjs";
import { renderLongForm } from "../scripts/longform-render.mjs";
import { outTime } from "../src/longform/cuts.mjs";
import { censoredAudioArgs, toOtio } from "../scripts/longform-otio.mjs";
import { buildReel, clientOf, MIN_SILENCE, NOISE_DB, styleOf } from "../scripts/prep.mjs";
import { hashFile, runMediaTool } from "../scripts/quickcontent-ingest.mjs";
import { transcribeSource } from "../scripts/quickcontent-transcribe.mjs";
import { RoughCut } from "../src/longform/schema.mjs";
import { inside, isName } from "./lib.mjs";
import { tryAcquireHeavy } from "./process-resource.mjs";

const run = promisify(execFile);
const VIDEO = /\.(mp4|mov|m4v|mkv|webm)$/i;
const fail = (status, message) => Object.assign(new Error(message), { status });
const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};
const readJson = (file, fallback) => fsp.readFile(file, "utf8").then(JSON.parse, () => fallback);
const writeJson = async (file, data) => {
  const tmp = `${file}.${randomUUID()}.tmp`; // unikalny: raporty postępu mogą zapisywać równolegle
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
  await fsp.rename(tmp, file);
};
const readBody = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8"));
  } catch {
    throw fail(400, "Nieprawidłowy JSON");
  }
};
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

// Domyślne narzędzia — w testach podmieniane.
const defaultProviders = (root) => ({
  async probe(file) {
    const { stdout } = await run("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", file,
    ]);
    const j = JSON.parse(stdout);
    const [a, b] = String(j.streams?.[0]?.r_frame_rate ?? "30/1").split("/").map(Number);
    return { duration: +j.format.duration, width: j.streams[0].width, height: j.streams[0].height, fps: Math.round(a / (b || 1)) || 30 };
  },
  async transcribe(p, ctx) {
    const rel = `public/reels/${p.id}`;
    const out = await transcribeSource(
      { hash: await hashFile(path.join(root, rel, p.source)), dataDir: `${rel}/.longform`, masterPath: `${rel}/${p.source}`, duration: p.duration },
      {},
      ctx,
    );
    return out.words;
  },
  async measure(file, duration, ctx) {
    const sil = await runMediaTool("ffmpeg", ["-hide_banner", "-i", file, "-af", `silencedetect=noise=${NOISE_DB}dB:d=${MIN_SILENCE}`, "-f", "null", "-"], ctx);
    const silences = [];
    for (const m of String(sil.stderr).matchAll(/silence_(start|end): ([\d.]+)/g)) {
      if (m[1] === "start") silences.push({ start: +m[2], end: duration });
      else if (silences.length) silences.at(-1).end = +m[2];
    }
    const frames = parseRms((await runMediaTool("ffmpeg", rmsArgs(file), ctx)).stdout);
    return { silences, levelOf: (m) => speechRms(frames, m.start, m.end) };
  },
  requestAI: undefined, // editRoughCut użyje requestQuickContentAI
  broll: (query, minDuration, reelDir, opts) => fetchBroll(query, minDuration, reelDir, opts),
  logo: (brand, reelDir) => logoFor(brand, root, reelDir),
  mask: (input, ctx, onProgress) => buildMask({ ...input, root }, ctx, onProgress),
  render: (input, ctx) => renderLongForm(input, ctx),
});

// Claude CLI z --output-format json zwraca błąd (np. wygasłe logowanie) w polu `result`.
export const cliError = (stdout, stderr) => {
  try {
    const j = JSON.parse(stdout);
    if (j?.is_error && j.result) return String(j.result).slice(0, 300);
  } catch {
    /* nie JSON */
  }
  return (stderr.trim() || stdout.trim()).slice(-300);
};

// Operator CLI (Claude/Codex na koncie) przez quickcontent-ai.mjs potrzebuje runTool — jak worker QuickContent:
// stdin zamknięty, klucze env z wartością undefined usunięte (konto bez kluczy API), krótki błąd bez treści promptu.
const runTool = (cmd, args, { cwd, env = {}, maxOutputBytes = 16 << 20, onLine } = {}) =>
  new Promise((resolve, reject) => {
    const merged = { ...process.env, ...env };
    for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
    const child = spawn(cmd, args, { cwd, env: merged, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let truncated = false;
    let pending = "";
    child.stdout.on("data", (d) => {
      if (stdout.length + d.length > maxOutputBytes) truncated = true;
      else stdout += d;
      if (!onLine) return;
      const lines = (pending + d).split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) onLine(line, "stdout");
    });
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
    child.on("error", reject);
    child.on("close", (exitCode) =>
      exitCode === 0
        ? resolve({ exitCode, stdout, stderr, outputTruncated: truncated })
        : reject(new Error(`${path.basename(cmd)} zakończył się kodem ${exitCode}: ${cliError(stdout, stderr)}`)),
    );
  });

export function createLongFormService(root, { providers = {}, acquire = () => tryAcquireHeavy("LongForm") } = {}) {
  const tools = { ...defaultProviders(root), ...providers };
  const running = new Set(); // projekty z jobem w tym procesie
  const dir = (id) => path.join(root, "public/reels", id);
  const stateFile = (id) => path.join(dir(id), "longform.json");

  async function load(id) {
    if (!isName(id)) throw fail(400, "Nieprawidłowa nazwa projektu");
    // `running` sprawdzane przed odczytem: końcowy zapis joba poprzedza running.delete, więc bez wyścigu.
    const live = running.has(id);
    const p = await readJson(stateFile(id), null);
    if (!p) throw fail(404, "Nie ma takiego projektu LongForm");
    // Job przerwany restartem panelu: pliki zostają, stan wraca do ponowienia.
    if (["processing", "planning", "montage"].includes(p.state) && !live)
      return { ...p, state: "failed", failedFrom: p.state === "processing" ? "processing" : "cuts-approved", job: { ...p.job, error: "Zadanie przerwane restartem panelu — uruchom ponownie." } };
    return p;
  }
  const save = (p) => writeJson(stateFile(p.id), p);
  const revisionOf = (req) => Number(req.headers["x-edit-revision"]);

  async function create(b) {
    if (!isName(b.name)) throw fail(400, "Nazwa: małe litery, cyfry i myślniki");
    const src = typeof b.source === "string" && inside(root, b.source);
    if (!src || !VIDEO.test(src) || !fs.existsSync(src)) throw fail(400, "Wskaż plik wideo z folderu projektu (np. inbox/)");
    if (fs.existsSync(dir(b.name))) throw fail(409, "Projekt lub rolka o tej nazwie już istnieje");
    const rel = path.relative(root, src).split(path.sep).join("/");
    const client = b.client ?? clientOf(rel);
    const info = await tools.probe(src);
    await fsp.mkdir(dir(b.name), { recursive: true });
    const source = `source${path.extname(src).toLowerCase()}`;
    await fsp.copyFile(src, path.join(dir(b.name), source), fs.constants.COPYFILE_FICLONE);
    const style = styleOf(client ? `klienci/${client}/` : rel);
    await writeJson(path.join(dir(b.name), "reel.json"), {
      source,
      style,
      ...(client ? { client } : {}),
      fps: info.fps,
      format: { width: even(info.width), height: even(info.height) },
      segments: [{ start: 0, end: info.duration }],
      captions: [],
      overlays: [],
    });
    const p = {
      id: b.name, source, origin: rel, client: client ?? null, duration: info.duration,
      state: "created", roughcutRevision: 0, editRevision: 0, planStale: false, renderStale: false,
      job: null, warnings: [], usage: [],
    };
    await save(p);
    return p;
  }

  async function start(p, b) {
    let aiProvider;
    try {
      const env = parseEnv(await fsp.readFile(path.join(root, ".env"), "utf8").catch(() => ""));
      aiProvider = lfProvider(b.aiProvider, env);
    } catch (e) {
      throw fail(400, e.message);
    }
    const release = acquire();
    if (!release) throw fail(409, "Trwa inne ciężkie zadanie (QuickContent lub LongForm) — poczekaj na koniec");
    running.add(p.id);
    p = { ...p, state: "processing", aiProvider, warnings: [], job: { stage: "transcribe", progress: null, detail: "Transkrypcja", startedAt: new Date().toISOString() } };
    await save(p);
    const report = async (r) => {
      const progress = r.totalUnits ? r.completedUnits / r.totalUnits : (r.progress ?? null);
      p = { ...p, job: { ...p.job, stage: r.stage ?? p.job.stage, progress, detail: r.progressDetail ?? p.job.detail } };
      await save(p);
    };
    const ctx = {
      root, runTool, report,
      aiProvider,
      recordUsage: async (u) => { p = { ...p, usage: [...p.usage, { ...u, stage: "edit" }] }; },
    };
    (async () => {
      try {
        const src = path.join(dir(p.id), p.source);
        const words = (await tools.transcribe(p, ctx)).map((w, i) => ({ ...w, id: w.id ?? `w${i}` }));
        await writeJson(path.join(dir(p.id), "transcript.json"), words);
        const reelFile = path.join(dir(p.id), "reel.json");
        const reel = await readJson(reelFile, null);
        const draft = buildReel({ source: reel.source, words, silences: [], duration: p.duration, style: reel.style, client: p.client });
        await writeJson(reelFile, { ...reel, captions: draft.captions });

        await report({ stage: "measure", progress: null, progressDetail: "Cisza i poziom głosu" });
        const { silences, levelOf } = await tools.measure(src, p.duration, ctx);

        await report({ stage: "edit", progress: null, progressDetail: "Redakcja: dubli, falstarty, powtórzenia" });
        const rules = p.client ? await fsp.readFile(path.join(root, "klienci", p.client, "PREFERENCJE.md"), "utf8").catch(() => "") : "";
        let extraCuts = [];
        let extraProfanity = [];
        const warnings = [];
        try {
          ({ cuts: extraCuts, profanity: extraProfanity } = await editRoughCut(words, { ...ctx, requestAI: tools.requestAI }, { client: p.client, clientRules: rules.slice(0, 6000) }));
        } catch (e) {
          warnings.push(`Redakcja AI przez konto ${aiProvider === "codex" ? "Codex" : "Claude Code"} niedostępna (${String(e.message).split("\n")[0].slice(0, 300)}) — pokazuję tylko cięcia deterministyczne. Sprawdź logowanie w terminalu.`);
        }

        await report({ stage: "validate", progress: null, progressDetail: "Walidator cięć" });
        const rcFile = path.join(dir(p.id), "roughcut.json");
        const { doc, report: r } = buildRoughCut({
          words, duration: p.duration, silences, client: p.client, lex: loadLexicons(root),
          extraCuts, extraProfanity, prev: await readJson(rcFile, null), levelOf,
        });
        await writeJson(rcFile, doc);
        if (doc.mutes.length && !hasSfx("kruk", root))
          warnings.push("Brak dźwięku „kruk” (public/sfx/index.json) — cenzura działa jako samo wyciszenie.");
        if (r.degraded.length) warnings.push(`Walidator oznaczył ${r.degraded.length} cięć „do decyzji”.`);
        p = {
          ...p, state: "awaiting-cut-review", roughcutRevision: p.roughcutRevision + 1, warnings,
          report: r, job: { ...p.job, stage: "done", progress: 1, detail: "Gotowe do przeglądu", finishedAt: new Date().toISOString() },
        };
      } catch (e) {
        p = { ...p, state: "failed", job: { ...p.job, error: e.message, finishedAt: new Date().toISOString() } };
      } finally {
        await save(p).catch(() => {});
        running.delete(p.id);
        release();
      }
    })();
    return p;
  }

  const readEnv = async () => parseEnv(await fsp.readFile(path.join(root, ".env"), "utf8").catch(() => ""));
  const planFile = (id) => path.join(dir(id), "plan.json");
  // Słowa po zatwierdzonych cięciach (jak keptWords w src/reel-timing.ts).
  const keptWords = (words, segments) => words.filter((w) => segments.some((s) => w.start >= s.start - 0.25 && w.start < s.end));

  // Wspólny szkielet ciężkiego joba (plan, montaż): blokada z QuickContent, stan w longform.json, błąd = failed z powodem.
  async function runJob(p, { state, stage, detail, done }, work) {
    const release = acquire();
    if (!release) throw fail(409, "Trwa inne ciężkie zadanie (QuickContent lub LongForm) — poczekaj na koniec");
    running.add(p.id);
    const before = p.state;
    p = { ...p, state, warnings: [], job: { stage, progress: null, detail, startedAt: new Date().toISOString() } };
    await save(p);
    const ctx = {
      root,
      runTool,
      aiProvider: p.aiProvider ?? lfProvider(undefined, await readEnv()),
      requestAI: tools.requestAI,
      report: async (r) => {
        p = { ...p, job: { ...p.job, stage: r.stage ?? p.job.stage, progress: r.totalUnits ? r.completedUnits / r.totalUnits : (r.progress ?? null), detail: r.progressDetail ?? p.job.detail } };
        await save(p);
      },
      recordUsage: async (u) => {
        p = { ...p, usage: [...(p.usage ?? []), { ...u, stage }] };
      },
    };
    (async () => {
      try {
        const patch = await work(ctx, () => p);
        p = { ...p, ...patch, state: done, job: { ...p.job, progress: 1, detail: "Gotowe", finishedAt: new Date().toISOString() } };
      } catch (e) {
        p = { ...p, state: "failed", failedFrom: before, job: { ...p.job, error: String(e.message).split("\n")[0].slice(0, 400), finishedAt: new Date().toISOString() } };
      } finally {
        await save(p).catch(() => {});
        running.delete(p.id);
        release();
      }
    })();
    return p;
  }

  async function plan(p, b) {
    if (!["cuts-approved", "plan-review", "done"].includes(p.state) && !(p.state === "failed" && p.failedFrom !== "processing"))
      throw fail(409, "Najpierw zatwierdź cięcia");
    const intensity = ["spokojna", "standard", "dynamiczna"].includes(b.intensity) ? b.intensity : "standard";
    return runJob(p, { state: "planning", stage: "plan", detail: "Rozdziały, hook i plan efektów", done: "plan-review" }, async (ctx) => {
      const reel = await readJson(path.join(dir(p.id), "reel.json"), null);
      const words = keptWords(await readJson(path.join(dir(p.id), "transcript.json"), []), reel.segments);
      if (words.length < 3) throw new Error("Za mało słów po cięciach, żeby zaplanować montaż.");
      const rules = p.client ? (await fsp.readFile(path.join(root, "klienci", p.client, "PREFERENCJE.md"), "utf8").catch(() => "")).slice(0, 6000) : "";
      const raw = await requestPlan(words, ctx, { clientRules: rules, intensity });
      const ch = validateChapters(raw.chapters, words, reel.segments);
      const hooks = validateHooks(raw.hooks);
      const co = validateColdOpen(raw.coldOpen, words, ch.chapters);
      const fx = validatePlan(raw.effects, { words, chapters: ch.chapters, intensity });
      const total = outTime(Infinity, reel.segments);
      const doc = {
        createdAt: new Date().toISOString(),
        intensity,
        chapters: ch.chapters,
        hooks: hooks.hooks,
        hook: 0,
        customHook: "",
        coldOpen: co.coldOpen,
        effects: fx.effects,
        rejected: fx.rejected.map((r) => ({ type: r.effect?.type, why: r.why })),
        warnings: [...ch.warnings, ...hooks.warnings, ...(co.warning ? [co.warning] : []), ...fx.warnings],
        youtube: youtubeChapters(ch.chapters, total),
      };
      await writeJson(planFile(p.id), doc);
      return { planRevision: (p.planRevision ?? 0) + 1, planStale: false, renderStale: true, warnings: doc.warnings.slice(0, 20) };
    });
  }

  async function montage(p) {
    return runJob(p, { state: "montage", stage: "assets", detail: "Przebitki i logotypy", done: "done" }, async (ctx, current) => {
      const doc = await readJson(planFile(p.id), null);
      const reelFile = path.join(dir(p.id), "reel.json");
      const reel = await readJson(reelFile, null);
      const words = keptWords(await readJson(path.join(dir(p.id), "transcript.json"), []), reel.segments);
      const env = await readEnv();
      const warnings = [];
      const needs = doc.effects.filter((e) => !e.removed && (["broll", "logo"].includes(e.type) || (e.type === "background-swap" && e.params.bg === "broll")));
      for (const [i, e] of needs.entries()) {
        await ctx.report({ stage: "assets", completedUnits: i, totalUnits: needs.length, progressDetail: `Assety ${i + 1}/${needs.length}` });
        try {
          const got =
            e.type !== "logo"
              ? await tools.broll(e.params.query, Math.max(2, e.end - e.start), dir(p.id), { key: env.PEXELS_API_KEY, cacheDir: path.join(root, ".longform/cache/pexels") })
              : await tools.logo(e.params.brand, dir(p.id));
          if (got) e.params = { ...e.params, src: got.src, credit: got.credit, logoSource: got.source };
          else warnings.push(e.type === "logo" ? `Logo „${e.params.brand}”: brak oficjalnego pliku w public/Brandings/_logos — efekt pominięty.` : `Brak przebitki Pexels dla „${e.params.query}” — efekt pominięty.`);
        } catch (err) {
          warnings.push(`${e.type === "broll" ? "Pexels" : "Logo"}: ${err.message} — efekt pominięty.`);
        }
      }
      // Segmentacja (L4): maska osoby tylko dla zakresów efektów z maską; % = klatki przetworzone przez Vision.
      const masked = doc.effects.filter((e) => !e.removed && CATALOG[e.type]?.mask);
      const spanOf = (e) => effectSpan(reel.segments, words, e.fromWordId, e.toWordId, minDuration(e.type));
      const frames = masked.reduce((n, e) => n + Math.round((spanOf(e).end - spanOf(e).start + 0.2) * (reel.fps ?? 30)), 0);
      let doneFrames = 0;
      for (const [i, e] of masked.entries()) {
        const label = `Segmentacja osoby ${i + 1}/${masked.length}`;
        await ctx.report({ stage: "segment", completedUnits: doneFrames, totalUnits: frames, progressDetail: label });
        const params = { ...e.params };
        delete params.mask;
        delete params.maskError;
        try {
          const size = reel.format ?? { width: 1080, height: 1920 };
          const got = await tools.mask(
            { reelDir: dir(p.id), source: reel.source, ...spanOf(e), fps: reel.fps ?? 30, width: size.width, height: size.height, duration: p.duration },
            ctx,
            (done) => ctx.report({ stage: "segment", completedUnits: Math.min(frames, doneFrames + done), totalUnits: frames, progressDetail: `${label} · klatka ${done}` }),
          );
          e.params = { ...params, mask: { src: got.src, from: got.from } };
        } catch (err) {
          e.params = { ...params, maskError: String(err.message).split("\n")[0].slice(0, 160) };
        }
        doneFrames += Math.round((spanOf(e).end - spanOf(e).start + 0.2) * (reel.fps ?? 30));
      }
      const { skipped, ...next } = planToReel(reel, doc, words);
      await writeJson(reelFile, next);
      await writeJson(planFile(p.id), doc);
      for (const sk of skipped) if (!warnings.some((w) => w.includes(sk.why.split("„")[1] ?? sk.why))) warnings.push(`Efekt ${sk.id}: ${sk.why}.`);
      await ctx.report({ stage: "render", progress: 0, progressDetail: "Render filmu" });
      const key = `${current().editRevision}.${current().planRevision}`;
      const record = await tools.render({ reelName: p.id, data: next, editRevision: key }, ctx);
      return { renders: [...(current().renders ?? []), { ...record, key }], renderStale: false, warnings };
    });
  }

  async function route(req, res, url) {
    // /api/lf/<id>/<sub>/<action>; w Vite middleware „/api” jest już obcięte
    const [, , id, sub, action] = url.pathname.replace(/^\/api(?=\/)/, "").split("/");
    const m = req.method;
    if (id === "projects" && !sub) {
      if (m === "POST") return send(res, 201, await create(await readBody(req)));
      if (m === "GET") {
        const names = await fsp.readdir(path.join(root, "public/reels")).catch(() => []);
        const list = (await Promise.all(names.filter(isName).map((n) => load(n).catch(() => null)))).filter(Boolean);
        return send(res, 200, list);
      }
    }
    if (id === "projects" && sub && m === "GET") return send(res, 200, await load(sub));
    if (id === "sources" && m === "GET") {
      // Pliki do wyboru: inbox/ i foldery klientów (bez renderów).
      const found = [];
      const walk = async (rel, depth) => {
        for (const e of await fsp.readdir(path.join(root, rel), { withFileTypes: true }).catch(() => [])) {
          const r = `${rel}/${e.name}`;
          if (e.isDirectory() && depth > 0 && !["Render", "QuickContent"].includes(e.name)) await walk(r, depth - 1);
          else if (e.isFile() && VIDEO.test(e.name)) found.push(r);
        }
      };
      await walk("inbox", 1);
      await walk("klienci", 2);
      return send(res, 200, found.sort());
    }
    let p = await load(id);
    if (sub === "process" && m === "POST") {
      if (p.state === "processing") throw fail(409, "Przetwarzanie już trwa");
      return send(res, 202, await start(p, await readBody(req)));
    }
    if (sub === "roughcut" && !action && m === "GET") {
      const roughcut = await readJson(path.join(dir(id), "roughcut.json"), null);
      if (!roughcut) throw fail(404, "Brak cięć — najpierw „Przetwarzaj”");
      const words = await readJson(path.join(dir(id), "transcript.json"), []);
      const reel = await readJson(path.join(dir(id), "reel.json"), null);
      return send(res, 200, { revision: p.roughcutRevision, roughcut, words, reel, project: p });
    }
    if (sub === "roughcut" && (m === "PUT" || (m === "POST" && action === "approve"))) {
      if (p.state === "processing") throw fail(409, "Trwa przetwarzanie");
      if (revisionOf(req) !== p.roughcutRevision) throw fail(409, "Cięcia zmieniły się w innym oknie — odśwież");
      const file = path.join(dir(id), "roughcut.json");
      if (m === "PUT") {
        const parsed = RoughCut.safeParse(await readBody(req));
        if (!parsed.success) throw fail(400, "Nieprawidłowe cięcia");
        await writeJson(file, parsed.data);
        p = { ...p, roughcutRevision: p.roughcutRevision + 1 };
        // Zmiana po zatwierdzeniu: wracamy do przeglądu, plan i render tracą aktualność.
        if (p.state === "cuts-approved") p = { ...p, state: "awaiting-cut-review", planStale: true, renderStale: true };
        await save(p);
        return send(res, 200, { revision: p.roughcutRevision });
      }
      const doc = RoughCut.parse(await readJson(file, null));
      const reelFile = path.join(dir(id), "reel.json");
      const reel = await readJson(reelFile, null);
      await writeJson(reelFile, { ...reel, segments: applyDecisions(doc.sourceDuration, doc.cuts), mutes: doc.mutes });
      p = { ...p, state: "cuts-approved", editRevision: p.editRevision + 1, planStale: true, renderStale: true };
      await save(p);
      return send(res, 200, p);
    }
    if (sub === "plan" && !action && m === "POST") return send(res, 202, await plan(p, await readBody(req)));
    if (sub === "plan" && !action && m === "GET") {
      const doc = await readJson(planFile(id), null);
      if (!doc) throw fail(404, "Brak planu — najpierw zatwierdź cięcia i wygeneruj plan");
      return send(res, 200, { revision: p.planRevision ?? 0, plan: doc, project: p });
    }
    if (sub === "plan" && (m === "PUT" || (m === "POST" && action === "approve"))) {
      if (["planning", "montage", "processing"].includes(p.state)) throw fail(409, "Trwa inne zadanie tego projektu");
      if (revisionOf(req) !== (p.planRevision ?? 0)) throw fail(409, "Plan zmienił się w innym oknie — odśwież");
      const doc = await readJson(planFile(id), null);
      if (!doc) throw fail(404, "Brak planu");
      if (m === "POST") return send(res, 202, await montage(p));
      const b = await readBody(req);
      const removed = new Set(Array.isArray(b.removed) ? b.removed : doc.effects.filter((e) => e.removed).map((e) => e.id));
      const next = {
        ...doc,
        hook: Number.isInteger(b.hook) && b.hook >= 0 && b.hook < doc.hooks.length ? b.hook : doc.hook,
        customHook: typeof b.customHook === "string" ? b.customHook.slice(0, 120) : doc.customHook,
        coldOpen: doc.coldOpen && typeof b.coldOpenAccepted === "boolean" ? { ...doc.coldOpen, accepted: b.coldOpenAccepted } : doc.coldOpen,
        chapters: doc.chapters.map((c) => ({ ...c, title: typeof b.chapterTitles?.[c.startWordId] === "string" ? b.chapterTitles[c.startWordId].slice(0, 80) : c.title })),
        effects: doc.effects.map((e) => ({ ...e, removed: removed.has(e.id) || undefined })),
      };
      await writeJson(planFile(id), next);
      p = { ...p, planRevision: (p.planRevision ?? 0) + 1, renderStale: true, state: p.state === "done" ? "plan-review" : p.state };
      await save(p);
      return send(res, 200, { revision: p.planRevision });
    }
    if (sub === "renders" && m === "GET") {
      const renders = p.renders ?? [];
      const key = `${p.editRevision}.${p.planRevision ?? 0}`;
      const current = !p.renderStale ? renders.filter((r) => r.key === key).at(-1)?.file ?? null : null;
      return send(res, 200, { renders, current });
    }
    if (sub === "export" && action === "otio" && m === "GET") {
      const reel = await readJson(path.join(dir(id), "reel.json"), null);
      const mediaPath = path.join(dir(id), p.source);
      let audioPath = mediaPath;
      if (reel.mutes?.length) {
        audioPath = path.join(dir(id), "audio-censored.wav");
        await (tools.runFfmpeg ?? ((args) => runMediaTool("ffmpeg", args, { root })))(censoredAudioArgs(mediaPath, reel.mutes, audioPath));
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${id}.otio"`);
      return res.end(JSON.stringify(toOtio(reel, { mediaPath, audioPath, name: id }), null, 2));
    }
    throw fail(404, "Nie ma takiej trasy LongForm");
  }

  return {
    route: (req, res, url) =>
      route(req, res, url).catch((e) => {
        if (!res.headersSent) send(res, e.status ?? 500, { error: e.message });
      }),
  };
}
