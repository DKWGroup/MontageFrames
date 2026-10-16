import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Readable, Writable } from "node:stream";
import { URL } from "node:url";
import { setTimeout } from "node:timers";
import { createLongFormService } from "./longform-server.mjs";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const words = ["Dzień", "yyy", "dobry,", "dobra", "jeszcze", "raz", "dzień", "dobry", "kurwa", "mać."].map((text, i) => ({
  id: `w${i}`,
  text,
  start: i,
  end: i + 0.8,
}));

const PLAN_ANSWER = {
  chapters: [
    { role: "intro", startWord: "w0", title: "Wstęp", thesis: "", promise: "", cta: "", confidence: 0.9 },
    { role: "body", startWord: "w3", title: "Dzień dobry", thesis: "", promise: "", cta: "", confidence: 0.9 },
  ],
  hooks: [
    { text: "Dzień dobry bez kurtuazji", type: "kontrast", why: "teza" },
    { text: "Hej kochani, witajcie", type: "x", why: "y" },
  ],
  coldOpen: null,
  effects: [
    { type: "typography", fromWord: "w1", toWord: "w2", why: "teza", paramsJson: "{\"text\":\"Dzień dobry\"}" },
    { type: "broll", fromWord: "w4", toWord: "w5", why: "ilustracja", paramsJson: "{\"query\":\"morning\"}" },
    { type: "logo", fromWord: "w5", toWord: "w5", why: "marka", paramsJson: "{\"brand\":\"Netflix\"}" },
    { type: "headline-wall", fromWord: "w1", toWord: "w2", why: "x", paramsJson: "{}" },
  ],
};

async function fixture(t, { requestAI, busy = false, mask } = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "lf-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "inbox"), { recursive: true });
  await fs.mkdir(path.join(root, "src/longform"), { recursive: true });
  for (const f of ["fillers-pl.json", "profanity-pl.json"])
    await fs.copyFile(path.join(import.meta.dirname, "../src/longform", f), path.join(root, "src/longform", f));
  await fs.writeFile(path.join(root, "inbox/nagranie.mp4"), "video");
  const service = createLongFormService(root, {
    acquire: () => (busy ? null : () => {}),
    providers: {
      probe: async () => ({ duration: 10, width: 1920, height: 1080, fps: 25 }),
      transcribe: async () => words,
      measure: async () => ({ silences: [{ start: 9.7, end: 10 }], levelOf: () => -20 }),
      runFfmpeg: async () => {},
      broll: async (query) => (query === "morning" ? { src: "assets/pexels/9.mp4", credit: "A / Pexels" } : null),
      logo: async () => null,
      mask: mask ?? (async () => ({ src: "assets/masks/x/cutout.webm", from: 0 })),
      render: async ({ editRevision }) => ({ file: "out/wywiad-v001.mp4", version: 1, editRevision, verified: true, createdAt: "2026-10-16T10:00:00.000Z" }),
      requestAI:
        requestAI ??
        (async (r) => r.name === "longform_plan" ? PLAN_ANSWER : ({
          cuts: [{ wordIds: ["w3", "w4", "w5"], kind: "offtopic", reason: "do realizatora", confidence: 0.95, keepPause: null }],
        })),
    },
  });
  return { root, service };
}

async function request(service, method, url, body, headers = {}) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  req.method = method;
  req.headers = { host: "127.0.0.1:3100", "x-panel": "1", ...headers };
  let output = "";
  const res = new Writable({
    write(chunk, _enc, done) {
      output += chunk.toString();
      done();
    },
  });
  res.headers = {};
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.statusCode = 200;
  await service.route(req, res, new URL(url, "http://127.0.0.1:3100"));
  return { status: res.statusCode, headers: res.headers, body: output && res.headers["content-type"]?.includes("json") ? JSON.parse(output) : output };
}

async function processed(service) {
  assert.equal((await request(service, "POST", "/api/lf/projects", { name: "wywiad", source: "inbox/nagranie.mp4" })).status, 201);
  assert.equal((await request(service, "POST", "/api/lf/wywiad/process")).status, 202);
  for (let i = 0; i < 200; i++) {
    const p = (await request(service, "GET", "/api/lf/projects/wywiad")).body;
    if (p.state !== "processing") return p;
    await pause(10);
  }
  throw new Error("timeout");
}

test("projekt: źródło spoza repo albo nie-wideo odrzucone, nazwa unikalna", async (t) => {
  const { service } = await fixture(t);
  assert.equal((await request(service, "POST", "/api/lf/projects", { name: "x", source: "../etc/passwd.mp4" })).status, 400);
  assert.equal((await request(service, "POST", "/api/lf/projects", { name: "x", source: "inbox/a.txt" })).status, 400);
  assert.equal((await request(service, "POST", "/api/lf/projects", { name: "x", source: "inbox/nagranie.mp4" })).status, 201);
  assert.equal((await request(service, "POST", "/api/lf/projects", { name: "x", source: "inbox/nagranie.mp4" })).status, 409);
});

test("Przetwarzaj kończy się na przeglądzie cięć: format, transkrypt, cisza, AI, cenzura", async (t) => {
  const { root, service } = await fixture(t);
  const p = await processed(service);
  assert.equal(p.state, "awaiting-cut-review");
  const reel = JSON.parse(await fs.readFile(path.join(root, "public/reels/wywiad/reel.json"), "utf8"));
  assert.deepEqual(reel.format, { width: 1920, height: 1080 });
  assert.equal(reel.fps, 25);
  assert.deepEqual(reel.segments, [{ start: 0, end: 10 }]);
  const { body } = await request(service, "GET", "/api/lf/wywiad/roughcut");
  assert.equal(body.words.length, 10);
  assert.deepEqual(body.roughcut.cuts.map((c) => [c.kind, c.decision]), [
    ["filler", "cut"],
    ["offtopic", "cut"],
  ]);
  assert.equal(body.roughcut.mutes[0].wordId, "w8");
  assert.equal(body.roughcut.mutes[0].level, -20);
  assert.equal(body.revision, 1);
  assert.ok(p.warnings.some((w) => /kruk/.test(w)));
});

test("błąd operatora AI nie blokuje przeglądu: zostają cięcia deterministyczne + ostrzeżenie", async (t) => {
  const { service } = await fixture(t, { requestAI: async () => { throw new Error("Brak logowania"); } });
  const p = await processed(service);
  assert.equal(p.state, "awaiting-cut-review");
  assert.ok(p.warnings.some((w) => /Brak logowania/.test(w)));
});

test("zajęty ciężki job = 409", async (t) => {
  const { service } = await fixture(t, { busy: true });
  await request(service, "POST", "/api/lf/projects", { name: "wywiad", source: "inbox/nagranie.mp4" });
  assert.equal((await request(service, "POST", "/api/lf/wywiad/process")).status, 409);
});

test("PUT roughcut wymaga aktualnej rewizji, waliduje dokument", async (t) => {
  const { service } = await fixture(t);
  await processed(service);
  const { body } = await request(service, "GET", "/api/lf/wywiad/roughcut");
  const doc = { ...body.roughcut, cuts: body.roughcut.cuts.map((c) => ({ ...c, decision: "keep", auto: false })) };
  assert.equal((await request(service, "PUT", "/api/lf/wywiad/roughcut", doc, { "x-edit-revision": "0" })).status, 409);
  assert.equal((await request(service, "PUT", "/api/lf/wywiad/roughcut", { ...doc, cuts: [{ id: "x" }] }, { "x-edit-revision": "1" })).status, 400);
  const ok = await request(service, "PUT", "/api/lf/wywiad/roughcut", doc, { "x-edit-revision": "1" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.revision, 2);
});

test("zatwierdzenie zapisuje segments + mutes, podbija editRevision, unieważnia plan i render", async (t) => {
  const { root, service } = await fixture(t);
  await processed(service);
  assert.equal((await request(service, "POST", "/api/lf/wywiad/roughcut/approve", undefined, { "x-edit-revision": "0" })).status, 409);
  const res = await request(service, "POST", "/api/lf/wywiad/roughcut/approve", undefined, { "x-edit-revision": "1" });
  assert.equal(res.status, 200);
  assert.equal(res.body.state, "cuts-approved");
  assert.equal(res.body.editRevision, 1);
  assert.equal(res.body.planStale, true);
  assert.equal(res.body.renderStale, true);
  const reel = JSON.parse(await fs.readFile(path.join(root, "public/reels/wywiad/reel.json"), "utf8"));
  assert.deepEqual(reel.segments.map((s) => [s.start, s.end]), [[0, 1], [1.8, 3], [5.8, 10]]);
  assert.equal(reel.mutes.length, 1);
});

test("eksport OTIO: segmenty po zatwierdzeniu i audio z cenzurą", async (t) => {
  const { service } = await fixture(t);
  await processed(service);
  await request(service, "POST", "/api/lf/wywiad/roughcut/approve", undefined, { "x-edit-revision": "1" });
  const res = await request(service, "GET", "/api/lf/wywiad/export/otio");
  assert.equal(res.status, 200);
  assert.match(res.headers["content-disposition"], /wywiad\.otio/);
  const [video, audio] = res.body.tracks.children;
  assert.equal(video.children.length, 3);
  assert.match(audio.children[0].media_reference.target_url, /audio-censored\.wav$/);
});

test("edycja cięć po zatwierdzeniu wraca do przeglądu i unieważnia plan i render", async (t) => {
  const { service } = await fixture(t);
  await processed(service);
  await request(service, "POST", "/api/lf/wywiad/roughcut/approve", undefined, { "x-edit-revision": "1" });
  const { body } = await request(service, "GET", "/api/lf/wywiad/roughcut");
  await request(service, "PUT", "/api/lf/wywiad/roughcut", body.roughcut, { "x-edit-revision": "1" });
  const p = (await request(service, "GET", "/api/lf/projects/wywiad")).body;
  assert.deepEqual([p.state, p.planStale, p.renderStale], ["awaiting-cut-review", true, true]);
});

test("trasy działają z prefiksem /api i bez niego (Vite obcina „/api”)", async (t) => {
  const { service } = await fixture(t);
  assert.equal((await request(service, "GET", "/lf/projects")).status, 200);
  assert.equal((await request(service, "GET", "/api/lf/projects")).status, 200);
});

test("operator: domyślny = konto Claude nawet przy .env z OpenAI; openai odrzucone przed startem", async (t) => {
  const seen = [];
  const { root, service } = await fixture(t, { requestAI: async (_r, ctx) => (seen.push(ctx.aiProvider), { cuts: [] }) });
  await fs.writeFile(path.join(root, ".env"), "QUICKCONTENT_AI_PROVIDER=openai\n");
  await request(service, "POST", "/api/lf/projects", { name: "wywiad", source: "inbox/nagranie.mp4" });
  assert.equal((await request(service, "POST", "/api/lf/wywiad/process", { aiProvider: "openai" })).status, 400);
  const p = await processed2(service);
  assert.equal(p.state, "awaiting-cut-review");
  assert.deepEqual(seen, ["claude"]);
  assert.equal(p.aiProvider, "claude");
});

async function processed2(service) {
  assert.equal((await request(service, "POST", "/api/lf/wywiad/process")).status, 202);
  for (let i = 0; i < 200; i++) {
    const p = (await request(service, "GET", "/api/lf/projects/wywiad")).body;
    if (p.state !== "processing") return p;
    await pause(10);
  }
  throw new Error("timeout");
}

import { cliError } from "./longform-server.mjs";
test("błąd CLI: czytelny powód z pola result zamiast ogona JSON", () => {
  assert.equal(cliError(JSON.stringify({ is_error: true, result: "Failed to authenticate: OAuth session expired" }), ""), "Failed to authenticate: OAuth session expired");
  assert.equal(cliError("", "codex: not logged in\n"), "codex: not logged in");
});

async function until(service, url, done) {
  for (let i = 0; i < 300; i++) {
    const p = (await request(service, "GET", url)).body;
    if (done(p)) return p;
    await pause(10);
  }
  throw new Error("timeout");
}
async function planned(service) {
  await processed(service);
  await request(service, "POST", "/api/lf/wywiad/roughcut/approve", undefined, { "x-edit-revision": "1" });
  assert.equal((await request(service, "POST", "/api/lf/wywiad/plan", { intensity: "standard" })).status, 202);
  return until(service, "/api/lf/projects/wywiad", (p) => p.state !== "planning");
}

test("plan: tylko po zatwierdzeniu cięć; AI przez konto; walidacja hooków i efektów; rozdziały YouTube z powodem", async (t) => {
  const { root, service } = await fixture(t);
  await processed(service);
  assert.equal((await request(service, "POST", "/api/lf/wywiad/plan")).status, 409);
  await request(service, "POST", "/api/lf/wywiad/roughcut/approve", undefined, { "x-edit-revision": "1" });
  await request(service, "POST", "/api/lf/wywiad/plan");
  const p = await until(service, "/api/lf/projects/wywiad", (x) => x.state !== "planning");
  assert.equal(p.state, "plan-review");
  const { body } = await request(service, "GET", "/api/lf/wywiad/plan");
  assert.equal(body.revision, 1);
  assert.deepEqual(body.plan.hooks.map((h) => h.text), ["Dzień dobry bez kurtuazji"]);
  assert.deepEqual(body.plan.effects.map((e) => e.type), ["typography", "broll", "logo"]);
  assert.ok(body.plan.rejected.some((r) => /katalog/.test(r.why)));
  assert.equal(body.plan.youtube.text, null);
  assert.match(body.plan.youtube.why, /3 rozdziałów/);
  assert.ok(JSON.parse(await fs.readFile(path.join(root, "public/reels/wywiad/plan.json"), "utf8")).effects.length === 3);
});

test("plan: edycja z rewizją (hook, usunięcie efektu), 409 przy starej", async (t) => {
  const { service } = await fixture(t);
  await planned(service);
  const { body } = await request(service, "GET", "/api/lf/wywiad/plan");
  const id = body.plan.effects[0].id;
  assert.equal((await request(service, "PUT", "/api/lf/wywiad/plan", { customHook: "Mój hook" }, { "x-edit-revision": "0" })).status, 409);
  const ok = await request(service, "PUT", "/api/lf/wywiad/plan", { customHook: "Mój hook", removed: [id], coldOpenAccepted: false }, { "x-edit-revision": "1" });
  assert.equal(ok.status, 200);
  const after = (await request(service, "GET", "/api/lf/wywiad/plan")).body;
  assert.equal(after.revision, 2);
  assert.equal(after.plan.customHook, "Mój hook");
  assert.equal(after.plan.effects.find((e) => e.id === id).removed, true);
});

test("akceptacja planu: assety, reel.json z efektami, render jako wersja; brak logo = efekt pominięty z ostrzeżeniem", async (t) => {
  const { root, service } = await fixture(t);
  await planned(service);
  assert.equal((await request(service, "POST", "/api/lf/wywiad/plan/approve", undefined, { "x-edit-revision": "1" })).status, 202);
  const p = await until(service, "/api/lf/projects/wywiad", (x) => x.state !== "montage");
  assert.equal(p.state, "done");
  assert.equal(p.renders.length, 1);
  assert.equal(p.renderStale, false);
  assert.ok(p.warnings.some((w) => /Netflix/.test(w)));
  const reel = JSON.parse(await fs.readFile(path.join(root, "public/reels/wywiad/reel.json"), "utf8"));
  const lf = reel.overlays.filter((o) => o.lf).map((o) => `${o.type}${o.role ? ":" + o.role : ""}`);
  // typography z w1–w2 wypada w oknie hooka (3 s) — pominięta z ostrzeżeniem zamiast nakładać się na hook.
  assert.deepEqual(lf, ["typography:hook", "chapter-card", "media"]);
  assert.ok(p.warnings.some((w) => /nachodzi na hook/.test(w)));
  assert.equal(reel.overlays.find((o) => o.type === "media").src, "assets/pexels/9.mp4");
  const r = (await request(service, "GET", "/api/lf/wywiad/renders")).body;
  assert.equal(r.renders[0].file, "out/wywiad-v001.mp4");
  assert.equal(r.current, "out/wywiad-v001.mp4");
});

test("montaż z maską: etap Segmentacja z % klatek; maska gotowa → warstwa L4, błąd maski → wariant bez maski z adnotacją", async (t) => {
  const seen = [];
  let call = 0;
  const answer = {
    ...PLAN_ANSWER,
    effects: [
      { type: "text-behind", fromWord: "w6", toWord: "w7", why: "teza", paramsJson: "{\"text\":\"Dzień\"}" },
      { type: "vertigo", fromWord: "w7", toWord: "w7", why: "zwrot", paramsJson: "{}" },
    ],
  };
  const { root, service } = await fixture(t, {
    requestAI: async (r) => (r.name === "longform_plan" ? answer : { cuts: [] }),
    mask: async (input, ctx, onProgress) => {
      if (call++) throw new Error("Vision: brak osoby");
      await onProgress(10, 54);
      seen.push((await request(service, "GET", "/api/lf/projects/wywiad")).body.job);
      return { src: "assets/masks/5.90-8.90/cutout.webm", from: 5.9 };
    },
  });
  await planned(service);
  await request(service, "POST", "/api/lf/wywiad/plan/approve", undefined, { "x-edit-revision": "1" });
  const p = await until(service, "/api/lf/projects/wywiad", (x) => x.state !== "montage");
  assert.equal(p.state, "done");
  assert.equal(seen[0].stage, "segment");
  assert.ok(seen[0].progress > 0 && seen[0].progress < 1);
  assert.match(seen[0].detail, /Segmentacja osoby 1\/2 · klatka 10/);
  const reel = JSON.parse(await fs.readFile(path.join(root, "public/reels/wywiad/reel.json"), "utf8"));
  const tb = reel.overlays.find((o) => o.type === "text-behind");
  assert.deepEqual(tb.mask, { src: "assets/masks/5.90-8.90/cutout.webm", from: 5.9 });
  assert.equal(reel.overlays.find((o) => o.type === "vertigo").noMask, true);
  assert.ok(p.warnings.some((w) => /bez maski osoby \(Vision: brak osoby\) — wariant: wolny najazd/.test(w)));
});
