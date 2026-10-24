import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Readable, Writable } from "node:stream";
import { URL } from "node:url";
import { setTimeout } from "node:timers";
import { createCutRawService } from "./cutraw-server.mjs";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const err = (status, message) => Object.assign(new Error(message), { status });

// Podstawione narzędzia CutRaw: projekt w pamięci + folder (lista czyta katalog public/cutraw).
function fakeTools(root, { gate } = {}) {
  const store = new Map();
  const calls = [];
  return {
    calls,
    loadProject: (name) => {
      if (!store.has(name)) throw err(404, `Brak projektu ${name}.`);
      return JSON.parse(JSON.stringify(store.get(name)));
    },
    async createProject(name, files, opts) {
      calls.push(["create", name, files, opts]);
      await fs.mkdir(path.join(root, "public/cutraw", name), { recursive: true });
      const p = { name, client: null, duration: 39, sources: files.map((f, i) => ({ id: `s${i}`, path: f })), cuts: [], mutes: [], revision: 1, exports: [] };
      store.set(name, p);
      return p;
    },
    saveCuts(name, revision, doc) {
      const p = store.get(name);
      if (revision !== p.revision) throw err(409, "Cięcia zmieniły się w innym oknie — odśwież.");
      Object.assign(p, doc, { revision: p.revision + 1 });
      return p;
    },
    nudgeSync(name, revision, source, delta) {
      calls.push(["nudge", source, delta]);
      return store.get(name);
    },
    setAngle(name, revision, camera, shows) {
      calls.push(["angle", revision, camera, shows]);
      return store.get(name);
    },
    async processProject(name, opt, { report, panel }) {
      calls.push(["process", opt, panel]);
      report({ stage: "transcribe", detail: "Transkrypcja (Whisper, lokalnie)", progress: 0.5 });
      await gate?.();
      store.get(name).processedAt = "2026-10-24T10:00:00.000Z";
      return { cuts: 3, undecided: 1, mutes: 1, kept: 30 };
    },
    async exportProject(name) {
      const p = store.get(name);
      const dir = path.join(root, "out", `${name}-cutraw-v001`);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${name}.xml`), "<xmeml/>");
      const rec = { version: 1, tag: "v001", dir: `out/${name}-cutraw-v001`, xml: `out/${name}-cutraw-v001/${name}.xml` };
      p.exports.push(rec);
      return rec;
    },
  };
}

async function fixture(t, opts = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "cutraw-srv-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const f of ["inbox/podcast/Kamera 1.mp4", "inbox/podcast/Ania.wav", "inbox/notatki.txt", "klienci/happy-news/Render/gotowe.mp4", "klienci/happy-news/odc/kam.mov"]) {
    await fs.mkdir(path.dirname(path.join(root, f)), { recursive: true });
    await fs.writeFile(path.join(root, f), "x");
  }
  const tools = fakeTools(root, opts);
  const revealed = [];
  const service = createCutRawService(root, { tools, acquire: () => (opts.busy ? null : () => {}), reveal: (f) => revealed.push(f) });
  return { root, tools, service, revealed };
}

async function request(service, method, url, body, headers = {}) {
  const req = Readable.from(body === undefined ? [] : [typeof body === "string" ? body : JSON.stringify(body)]);
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
  return { status: res.statusCode, body: output && res.headers["content-type"]?.includes("json") ? JSON.parse(output) : output };
}
const created = (service) =>
  request(service, "POST", "/api/cutraw/projects", { name: "odc-1", files: ["inbox/podcast/Kamera 1.mp4", "inbox/podcast/Ania.wav"], ref: "inbox/podcast/Kamera 1.mp4" });

test("źródła: wideo i audio z inbox/ i folderów klientów, bez renderów i innych plików", async (t) => {
  const { service } = await fixture(t);
  const { body } = await request(service, "GET", "/api/cutraw/sources");
  assert.deepEqual(body, [
    { path: "inbox/podcast/Ania.wav", kind: "audio", size: 1 },
    { path: "inbox/podcast/Kamera 1.mp4", kind: "video", size: 1 },
    { path: "klienci/happy-news/odc/kam.mov", kind: "video", size: 1 },
  ]);
});

test("upload z dysku: inbox/cutraw/, zajęta nazwa dostaje numer, bez plików .part i obcych typów", async (t) => {
  const { service, root } = await fixture(t);
  const up = (file, body) => request(service, "POST", `/api/cutraw/upload?file=${encodeURIComponent(file)}`, body);
  const first = await up("Kamera Ania.mp4", "abc");
  assert.deepEqual(first, { status: 201, body: { path: "inbox/cutraw/Kamera Ania.mp4", kind: "video", size: 3 } });
  assert.equal((await up("Kamera Ania.mp4", "abcd")).body.path, "inbox/cutraw/Kamera Ania (2).mp4");
  assert.equal((await up("../../etc/Mikrofon.wav", "x")).body.path, "inbox/cutraw/Mikrofon.wav");
  assert.equal((await up("notatki.txt", "x")).status, 400);
  assert.equal((await up(".ukryty.mp4", "x")).status, 400);
  assert.deepEqual((await fs.readdir(path.join(root, "inbox/cutraw"))).sort(), ["Kamera Ania (2).mp4", "Kamera Ania.mp4", "Mikrofon.wav"]);
  const listed = (await request(service, "GET", "/api/cutraw/sources")).body.map((s) => s.path);
  assert.ok(listed.includes("inbox/cutraw/Kamera Ania (2).mp4"));
});

test("nowy projekt: tylko pliki mediów z repo, kamera główna spośród wybranych", async (t) => {
  const { service, tools, root } = await fixture(t);
  const post = (b) => request(service, "POST", "/api/cutraw/projects", b);
  assert.equal((await post({ name: "x", files: ["../etc/passwd.wav"] })).status, 400);
  assert.equal((await post({ name: "x", files: ["inbox/notatki.txt"] })).status, 400);
  assert.equal((await post({ name: "x", files: ["inbox/brak.wav"] })).status, 400);
  assert.equal((await post({ name: "x", files: ["inbox/podcast/Ania.wav"], ref: "inbox/podcast/Kamera 1.mp4" })).status, 400);
  const ok = await created(service);
  assert.equal(ok.status, 201);
  const [, name, files, opts] = tools.calls.find((c) => c[0] === "create");
  assert.deepEqual([name, files, opts.ref], ["odc-1", [path.join(root, "inbox/podcast/Kamera 1.mp4"), path.join(root, "inbox/podcast/Ania.wav")], path.join(root, "inbox/podcast/Kamera 1.mp4")]);
  const list = (await request(service, "GET", "/api/cutraw/projects")).body;
  assert.deepEqual(list.map((p) => [p.name, p.sources]), [["odc-1", 2]]);
});

test("przetwarzanie: zadanie w tle z postępem, blokuje edycję cięć i drugie uruchomienie", async (t) => {
  let open;
  const gate = new Promise((r) => (open = r));
  const { service, tools } = await fixture(t, { gate: () => gate });
  await created(service);
  const started = await request(service, "POST", "/api/cutraw/odc-1/process", { pace: "gęste", ai: "openai", keepHead: 3, keepTail: 1, extra: "x" });
  assert.equal(started.status, 202);
  assert.deepEqual(tools.calls.find((c) => c[0] === "process").slice(1), [{ pace: "gęste", ai: "openai", keepHead: 3, keepTail: 1 }, true]);
  await pause(5);
  const live = (await request(service, "GET", "/api/cutraw/odc-1")).body.job;
  assert.deepEqual([live.state, live.stage, live.progress], ["running", "transcribe", 0.5]);
  assert.equal((await request(service, "POST", "/api/cutraw/odc-1/process", {})).status, 409);
  assert.equal((await request(service, "PUT", "/api/cutraw/odc-1/cuts", { cuts: [], mutes: [] }, { "x-edit-revision": "1" })).status, 409);
  open();
  for (let i = 0; i < 100 && (await request(service, "GET", "/api/cutraw/odc-1")).body.job.state === "running"; i++) await pause(5);
  const done = (await request(service, "GET", "/api/cutraw/odc-1")).body;
  assert.deepEqual([done.job.state, done.job.result.cuts, done.project.processedAt], ["done", 3, "2026-10-24T10:00:00.000Z"]);
});

test("zapis cięć z rewizją, zajęta blokada ciężkiej pracy, eksport i Finder", async (t) => {
  const { service, revealed, root, tools } = await fixture(t);
  await created(service);
  const put = (rev) => request(service, "PUT", "/api/cutraw/odc-1/cuts", { cuts: [], mutes: [] }, { "x-edit-revision": String(rev) });
  assert.equal((await put(7)).status, 409);
  assert.deepEqual(await put(1), { status: 200, body: { revision: 2 } });
  const angle = await request(service, "POST", "/api/cutraw/odc-1/angle", { camera: "s0" }, { "x-edit-revision": "2" });
  assert.deepEqual([angle.status, tools.calls.find((c) => c[0] === "angle")], [200, ["angle", 2, "s0", null]]);
  assert.equal((await request(service, "POST", "/api/cutraw/odc-1/export")).status, 202);
  await pause(20);
  assert.equal((await request(service, "POST", "/api/cutraw/odc-1/reveal", { version: 2 })).status, 404);
  const shown = await request(service, "POST", "/api/cutraw/odc-1/reveal", { version: 1 });
  assert.deepEqual([shown.status, revealed], [200, [path.join(root, "out/odc-1-cutraw-v001/odc-1.xml")]]);
  const busy = await fixture(t, { busy: true });
  await created(busy.service);
  const refused = await request(busy.service, "POST", "/api/cutraw/odc-1/process", {});
  assert.equal(refused.status, 409);
  assert.match(refused.body.error, /inne ciężkie zadanie/);
  assert.equal((await request(service, "GET", "/api/cutraw/Zła nazwa")).status, 400);
});
