import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Readable, Writable } from "node:stream";
import { URL } from "node:url";
import { ProjectSchema } from "../src/quickcontent/schema.mjs";
import { setTimeout } from "node:timers";
import {
  createQuickContentService,
  installQuickContentLifecycle,
} from "./quickcontent-server.mjs";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
test("Vite restart and close await worker shutdown before server replacement", async () => {
  const calls = [];
  let finish;
  const stopped = new Promise((resolve) => {
    finish = resolve;
  });
  const worker = {
    recover: async () => {},
    close: async () => {
      calls.push("worker stopping");
      await stopped;
      calls.push("worker stopped");
    },
  };
  const server = {
    config: { logger: { warn() {} } },
    restart: async () => calls.push("server restarted"),
    close: async () => calls.push("server closed"),
  };
  installQuickContentLifecycle(server, worker);
  const pending = server.restart();
  await pause(5);
  assert.deepEqual(calls, ["worker stopping"]);
  finish();
  await pending;
  assert.deepEqual(calls, [
    "worker stopping",
    "worker stopped",
    "server restarted",
  ]);
  await server.close();
  assert.equal(calls.at(-1), "server closed");
});
async function until(fn) {
  for (let i = 0; i < 300; i++) {
    const v = await fn();
    if (v) return v;
    await pause(20);
  }
  throw new Error("timeout");
}
async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-flow-"));
  await fs.mkdir(path.join(root, "src/styles"), { recursive: true });
  await fs.writeFile(path.join(root, "src/styles/persona.tsx"), "style");
  await fs.writeFile(path.join(root, "PREFERENCJE.md"), "preferencje");
  const words = Array.from({ length: 70 }, (_, i) => ({
    id: `w${i}`,
    text: "test.",
    start: i,
    end: i + 0.6,
  }));
  const candidate = (id, start, end) => ({
    id,
    analysisRunId: "a-first",
    firstWordId: `w${start}`,
    lastWordId: `w${end - 1}`,
    sourceStart: start,
    sourceEnd: end,
    title: id,
    summary: "Pełna historia",
    topic: "firma",
    kind: "opinia",
    thesis: id,
    score: 80,
    scoreBreakdown: {
      hook: 4,
      value: 4,
      emotion: 4,
      novelty: 4,
      focusMatch: 4,
    },
    completeness: { opening: 4, context: 4, development: 4, closing: 4 },
    confidence: "high",
    reason: "Uzasadniona opinia",
    contextRisk: "",
    status: "proposed",
    editRevision: 0,
    renders: [],
  });
  let ingestCount = 0,
    asrCount = 0,
    renderCount = 0;
  const service = createQuickContentService(root, {
    providers: {
      ingestSource: async (p) => {
        ingestCount++;
        const dataDir = `.quickcontent/workspace/${p.id}`;
        await fs.mkdir(path.join(root, dataDir), { recursive: true });
        for (const n of ["master.mp4", "proxy.mp4", "metadata.json"])
          await fs.writeFile(
            path.join(root, dataDir, n),
            n === "proxy.mp4" ? "0123456789" : "{}",
          );
        return {
          id: "source-one",
          dataDir,
          masterPath: dataDir + "/master.mp4",
          proxyPath: dataDir + "/proxy.mp4",
          metadataPath: dataDir + "/metadata.json",
          hash: "source-hash",
          duration: 70,
          width: 1920,
          height: 1080,
          title: "Rzeczywisty tytuł",
        };
      },
      transcribeSource: async (s) => {
        asrCount++;
        const rawPath = s.dataDir + "/raw.json",
          wordsPath = s.dataDir + "/words.json";
        await fs.writeFile(path.join(root, rawPath), "{}");
        await fs.writeFile(
          path.join(root, wordsPath),
          JSON.stringify({ words, hash: "words", status: "ready" }),
        );
        return { words, hash: "words", status: "ready", rawPath, wordsPath };
      },
      analyzeTranscript: async ({ previousCandidates }) => ({
        run: {
          id: `a-${previousCandidates.length}`,
          settingsKey: "settings",
          focus: { mode: "auto" },
          duration: { min: 15, max: 60 },
          coverage: { completed: 1, total: 1 },
          candidateIds: previousCandidates.length ? [] : ["c-one", "c-two"],
          status: "succeeded",
          exhausted: previousCandidates.length > 0,
          rejections: [],
        },
        candidates: previousCandidates.length
          ? []
          : [candidate("c-one", 0, 30), candidate("c-two", 35, 65)],
      }),
      materializeCandidate: async ({ project, candidate }) => {
        const reelName = "qc-" + candidate.id,
          dir = path.join(root, "public/reels", reelName);
        await fs.mkdir(dir, { recursive: true });
        const data = {
          source: "source.mp4",
          style: "persona",
          outputResolution: project.outputResolution ?? 1080,
          fps: 30,
          segments: [{ start: 0, end: 30 }],
          captions: [{ words: [{ text: "test", start: 0.2, end: 0.6 }] }],
          overlays: [],
        };
        const origin = {
          kind: "quickcontent",
          projectId: project.id,
          candidateId: candidate.id,
        };
        await fs.writeFile(path.join(dir, "reel.json"), JSON.stringify(data));
        await fs.writeFile(
          path.join(dir, "origin.json"),
          JSON.stringify(origin),
        );
        await fs.writeFile(path.join(dir, "source.mp4"), "video");
        return { reelName, data, origin };
      },
      editReel: async () => {},
      syncStudio: async () => {},
      makeThumbnail: async () => {},
      generateReelDescription: async () => ({ status: "ready" }),
      renderReelSnapshot: async ({ reelName, data, editRevision }) => {
        renderCount++;
        const filePath = `out/${reelName}-v${String(renderCount).padStart(3, "0")}.mp4`;
        await fs.mkdir(path.join(root, "out"), { recursive: true });
        await fs.writeFile(path.join(root, filePath), "verified MP4");
        return {
          filePath,
          renderRevision: editRevision,
          verified: true,
          signature: await service.signature(reelName, data),
        };
      },
      ...overrides,
    },
  });
  t.after(async () => {
    await service.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  return {
    service,
    root,
    counts: () => ({ ingestCount, asrCount, renderCount }),
  };
}
async function request(
  service,
  method,
  url,
  body,
  { headers = {}, raw = false } = {},
) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  req.method = method;
  req.headers = {
    host: "127.0.0.1:3100",
    "x-panel": "1",
    origin: "http://127.0.0.1:3100",
    ...headers,
  };
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
  return {
    status: res.statusCode,
    headers: res.headers,
    body: raw ? output : output ? JSON.parse(output) : null,
  };
}
async function created(service) {
  return (
    await request(service, "POST", "/api/quickcontent/projects", {
      sourceKind: "youtube",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      focus: { mode: "auto" },
      duration: { min: 15, max: 60 },
    })
  ).body;
}
test("project description instructions persist before montage and validate revision and limits", async t => {
  const { service } = await fixture(t);
  const p = (await request(service,"POST","/api/quickcontent/projects",{
    sourceKind:"youtube",url:"https://www.youtube.com/watch?v=abcdefghijk",descriptionInstructions:"  Krótki hook i spokojna puenta.  "
  })).body;
  assert.equal(p.descriptionInstructions,"Krótki hook i spokojna puenta.");
  const updated=(await request(service,"PUT",`/api/quickcontent/projects/${p.id}/description`,{descriptionInstructions:"  Bez emoji.  ",expectedRevision:p.revision})).body;
  assert.equal(updated.descriptionInstructions,"Bez emoji.");
  assert.equal((await service.store.getProject(p.id)).descriptionInstructions,"Bez emoji.");
  await assert.rejects(request(service,"PUT",`/api/quickcontent/projects/${p.id}/description`,{descriptionInstructions:"Inne",expectedRevision:p.revision}),e=>e.status===409);
  await assert.rejects(request(service,"PATCH",`/api/quickcontent/projects/${p.id}`,{descriptionInstructions:"x".repeat(4001),expectedRevision:updated.revision}));
  await assert.rejects(request(service,"PATCH",`/api/quickcontent/projects/${p.id}`,{descriptionInstructions:null,expectedRevision:updated.revision}));
  const cleared=(await request(service,"PATCH",`/api/quickcontent/projects/${p.id}`,{descriptionInstructions:"",expectedRevision:updated.revision})).body;
  assert.equal(cleared.descriptionInstructions,"");
  const legacy={...cleared};delete legacy.descriptionInstructions;
  assert.equal(ProjectSchema.parse(legacy).descriptionInstructions,"");
});
test("first automatic description receives saved project instructions",async t=>{
  const calls=[];
  const {service}=await fixture(t,{generateReelDescription:async(name,ctx)=>{calls.push({name,instructions:ctx.descriptionInstructions,snapshot:ctx.renderedData});return{status:"ready"};}});
  let p=await created(service);
  p=(await request(service,"PUT",`/api/quickcontent/projects/${p.id}/description`,{descriptionInstructions:"Zacznij pytaniem, bez emoji.",expectedRevision:p.revision})).body;
  const process=(await request(service,"POST",`/api/quickcontent/projects/${p.id}/process`,{})).body;
  await until(async()=>(await service.store.getJob(process.jobId)).status==="completed");
  p=await service.project(p.id);
  const batch=await service.startBatch(p.id,{candidateIds:["c-one"],expectedRevision:p.revision,idempotencyKey:"description-instructions"});
  await assert.rejects(request(service,"PUT",`/api/quickcontent/projects/${p.id}/description`,{descriptionInstructions:"Za późno",expectedRevision:p.revision}),e=>e.status===409);
  await until(async()=>(await service.store.getJob(batch.jobIds[0])).status==="completed");
  assert.equal(calls.length,1);assert.equal(calls[0].instructions,"Zacznij pytaniem, bez emoji.");assert.ok(calls[0].snapshot.captions.length);
});
test("GUI flow stops at proposals, preserves selection on find-more and only mounts selected clips", async (t) => {
  const { service, counts } = await fixture(t);
  let p = await created(service);
  const process = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () =>
      (await service.store.getJob(process.jobId)).status === "completed",
  );
  p = (await request(service, "GET", `/api/quickcontent/projects/${p.id}`))
    .body;
  assert.equal(p.title, "Rzeczywisty tytuł");
  assert.equal(p.candidates.length, 2);
  assert.equal(counts().renderCount, 0);
  p = (
    await request(
      service,
      "PUT",
      `/api/quickcontent/projects/${p.id}/selection`,
      { candidateIds: ["c-two"], expectedRevision: p.revision },
    )
  ).body;
  const more = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/find-more`,
      { expectedRevision: p.revision },
    )
  ).body;
  await until(
    async () => (await service.store.getJob(more.jobId)).status === "completed",
  );
  p = (await request(service, "GET", `/api/quickcontent/projects/${p.id}`))
    .body;
  assert.deepEqual(p.selectedCandidateIds, ["c-two"]);
  assert.equal(p.candidates.length, 2);
  assert.equal(p.analysisRuns.at(-1).exhausted, true);
  assert.equal(counts().ingestCount, 1);
  assert.equal(counts().asrCount, 1);
  const input = {
    candidateIds: ["c-two"],
    expectedRevision: p.revision,
    idempotencyKey: "click-one",
  };
  const batch = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/montage`,
      input,
    )
  ).body;
  const twice = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/montage`,
      input,
    )
  ).body;
  assert.equal(batch.batchId, twice.batchId);
  await until(
    async () =>
      (await service.store.getJob(batch.jobIds[0])).status === "completed",
  );
  p = (await request(service, "GET", `/api/quickcontent/projects/${p.id}`))
    .body;
  assert.equal(p.candidates[0].reelName, undefined);
  assert.equal(p.candidates[1].isCurrent, true);
  assert.equal(p.batches[0].completed, 1);
  assert.equal(p.batches[0].total, 1);
  assert.equal(counts().renderCount, 1);
});
test("project proxy streams GET and HEAD ranges, rejects out of bounds and foreign thumbnails", async (t) => {
  const { service } = await fixture(t);
  const p = await created(service);
  const { jobId } = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(jobId)).status === "completed",
  );
  const url = `/api/quickcontent/projects/${p.id}/media/proxy`;
  const part = await request(service, "GET", url, undefined, {
    raw: true,
    headers: { range: "bytes=2-5" },
  });
  assert.equal(part.status, 206);
  assert.equal(part.body, "2345");
  assert.equal(part.headers["content-range"], "bytes 2-5/10");
  assert.equal(part.headers["content-length"], 4);
  const head = await request(service, "HEAD", url, undefined, {
    raw: true,
    headers: { range: "bytes=-3" },
  });
  assert.equal(head.status, 206);
  assert.equal(head.body, "");
  assert.equal(head.headers["content-length"], 3);
  const bad = await request(service, "GET", url, undefined, {
    raw: true,
    headers: { range: "bytes=15-20" },
  });
  assert.equal(bad.status, 416);
  assert.equal(bad.headers["content-range"], "bytes */10");
  await assert.rejects(
    request(
      service,
      "GET",
      `/api/quickcontent/projects/${p.id}/media/thumbnails/foreign`,
    ),
    (e) => e.status === 404,
  );
});
test("reel edit invalidates prior render and legacy editor render goes through durable worker", async (t) => {
  const { service, root } = await fixture(t);
  let p = await created(service);
  const { jobId } = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(jobId)).status === "completed",
  );
  p = await service.project(p.id);
  const batch = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: p.revision,
    idempotencyKey: "batch",
  });
  await until(
    async () =>
      (await service.store.getJob(batch.jobIds[0])).status === "completed",
  );
  const file = path.join(root, "public/reels/qc-c-one/reel.json"),
    data = JSON.parse(await fs.readFile(file, "utf8"));
  data.captions[0].words[0].text = "poprawiono";
  await fs.writeFile(file, JSON.stringify(data));
  await service.reconcileReel("qc-c-one");
  p = await service.project(p.id);
  assert.equal(p.candidates[0].isCurrent, false);
  assert.equal(p.candidates[0].editRevision, 1);
  assert.equal(p.candidates[0].renders.length, 1);
  const legacy = await service.bridgeReelJob({
    method: "POST",
    reelName: "qc-c-one",
    body: { kind: "render" },
  });
  assert.equal(legacy.ok, true);
  await until(async () => {
    const current = await service.project(p.id);
    return (
      current.candidates[0].renders.length === 2 &&
      current.candidates[0].isCurrent
    );
  });
  assert.equal((await service.project(p.id)).candidates[0].editRevision, 1);
  assert.equal(
    JSON.parse(await fs.readFile(file, "utf8")).captions[0].words[0].start,
    0.2,
  );
});
test("trust boundary rejects stale selection, foreign candidate and cross-origin request", async (t) => {
  const { service } = await fixture(t);
  const p = await created(service);
  await assert.rejects(
    request(service, "PUT", `/api/quickcontent/projects/${p.id}/selection`, {
      candidateIds: [],
      expectedRevision: 999,
    }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    request(service, "PUT", `/api/quickcontent/projects/${p.id}/selection`, {
      candidateIds: ["foreign"],
      expectedRevision: p.revision,
    }),
    (e) => e.status === 400,
  );
  const req = Readable.from([]);
  req.method = "POST";
  req.headers = {
    "x-panel": "1",
    host: "127.0.0.1:3100",
    origin: "https://evil.example",
  };
  const res = { setHeader() {}, end() {} };
  await assert.rejects(
    service.route(
      req,
      res,
      new URL("/api/quickcontent/projects", "http://localhost"),
    ),
    (e) => e.status === 403,
  );
});
test("QC saves serialize revisions and reject stale text without replacing the current draft", async (t) => {
  const { service, root } = await fixture(t);
  let p = await created(service);
  const { jobId } = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(jobId)).status === "completed",
  );
  p = await service.project(p.id);
  const b = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: p.revision,
    idempotencyKey: "save",
  });
  await until(
    async () =>
      (await service.store.getJob(b.jobIds[0])).status === "completed",
  );
  const file = path.join(root, "public/reels/qc-c-one/reel.json"),
    data = JSON.parse(await fs.readFile(file, "utf8"));
  data.captions[0].words[0].text = "pierwsza zmiana";
  assert.equal(
    (await service.saveEditedReel("qc-c-one", data, 0)).editRevision,
    1,
  );
  const state = await service.readEditedReel("qc-c-one");
  assert.equal(state.editRevision, 1);
  assert.equal(state.data.captions[0].words[0].text, "pierwsza zmiana");
  const old = globalThis.structuredClone(data);
  old.captions[0].words[0].text = "stary draft";
  await assert.rejects(
    service.saveEditedReel("qc-c-one", old, 0),
    (e) => e.status === 409,
  );
  assert.equal(
    JSON.parse(await fs.readFile(file, "utf8")).captions[0].words[0].text,
    "pierwsza zmiana",
  );
  const other = globalThis.structuredClone(data);
  other.captions[0].words[0].text = "druga zmiana";
  const concurrent = await Promise.allSettled([
    service.saveEditedReel("qc-c-one", old, 1),
    service.saveEditedReel("qc-c-one", other, 1),
  ]);
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    concurrent.find((r) => r.status === "rejected").reason.status,
    409,
  );
});
test("QC edit boundary rejects invalid timing, framing, duplicate words and asset traversal", async (t) => {
  const { service, root } = await fixture(t);
  let p = await created(service);
  const { jobId } = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(jobId)).status === "completed",
  );
  p = await service.project(p.id);
  const b = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: p.revision,
    idempotencyKey: "validate",
  });
  await until(
    async () =>
      (await service.store.getJob(b.jobIds[0])).status === "completed",
  );
  const file = path.join(root, "public/reels/qc-c-one/reel.json"),
    before = JSON.parse(await fs.readFile(file, "utf8"));
  for (const mutate of [
    (d) => (d.fps = 0),
    (d) => (d.segments = []),
    (d) => (d.framing = { mode: "crop", centerX: 2, centerY: 0.5 }),
    (d) => d.captions[0].words.push({ ...d.captions[0].words[0] }),
    (d) =>
      (d.overlays = [
        { type: "media", start: 0, end: 1, src: "../../private.mp4" },
      ]),
    (d) => (d.captions[0].key = 99),
  ]) {
    const bad = globalThis.structuredClone(before);
    mutate(bad);
    await assert.rejects(service.saveEditedReel("qc-c-one", bad, 0));
    assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), before);
  }
});

test("portrait output settings save independently and selection starts no materialization", async (t) => {
  const { service, root } = await fixture(t);
  const p = await created(service);
  const saved = await request(
    service,
    "PUT",
    `/api/quickcontent/projects/${p.id}/output`,
    { expectedRevision: p.revision, outputResolution: 720 },
  );
  assert.equal(saved.body.outputResolution, 720);
  assert.equal(saved.body.resolution, 1080);
  await assert.rejects(
    request(service, "PUT", `/api/quickcontent/projects/${p.id}/output`, {
      expectedRevision: saved.body.revision,
      outputResolution: 1111,
    }),
  );
  const process = await request(
    service,
    "POST",
    `/api/quickcontent/projects/${p.id}/process`,
    {},
  );
  await until(
    async () =>
      (await service.store.getJob(process.body.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  await request(
    service,
    "PUT",
    `/api/quickcontent/projects/${p.id}/selection`,
    { expectedRevision: current.revision, candidateIds: ["c-one"] },
  );
  assert.equal(
    (await fs.readdir(path.join(root, "public/reels")).catch(() => [])).length,
    0,
  );
  assert.equal((await service.project(p.id)).costs.analysis.missing, 1);
});

test("retry after render failure preserves AI edit and manual corrections without a second paid edit", async (t) => {
  let edits = 0,
    renders = 0;
  const { service, root } = await fixture(t, {
    editReel: async () => {
      edits++;
    },
    renderReelSnapshot: async () => {
      if (++renders === 1) throw Error("encoder failed");
      return { filePath: "out/proof.mp4", verified: false };
    },
  });
  const p = await created(service);
  const job = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(job.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  const batch = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "retry-render",
  });
  await until(
    async () =>
      (await service.store.getJob(batch.jobIds[0])).status === "failed",
  );
  const replay = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "retry-render",
  });
  assert.deepEqual(replay.jobIds, batch.jobIds);
  const file = path.join(root, "public/reels/qc-c-one/reel.json");
  const d = JSON.parse(await fs.readFile(file));
  d.captions[0].words[0].text = "ręczna poprawka";
  await fs.writeFile(file, JSON.stringify(d));
  const chat = await service.bridgeReelJob({
    method: "POST",
    reelName: "qc-c-one",
    body: { kind: "chat", message: "Zachowaj poprawki", render: false },
  });
  await until(
    async () => (await service.store.getJob(chat.jobId)).status === "completed",
  );
  await service.worker.retry(batch.jobIds[0]);
  await until(
    async () =>
      (await service.store.getJob(batch.jobIds[0])).status === "completed",
  );
  assert.equal(edits, 2);
  assert.equal(
    JSON.parse(await fs.readFile(file)).captions[0].words[0].text,
    "ręczna poprawka",
  );
});
test("interrupted batch creation resumes its manifest instead of returning an empty batch", async (t) => {
  const { service } = await fixture(t);
  const p = await created(service);
  const process = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () =>
      (await service.store.getJob(process.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  const original = service.worker.enqueue;
  let interrupted = false;
  service.worker.enqueue = async (...args) => {
    if (args[0] === "montage" && !interrupted) {
      interrupted = true;
      throw Error("temporary interruption");
    }
    return original(...args);
  };
  const input = {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "resume",
  };
  await assert.rejects(service.startBatch(p.id, input));
  const resumed = await service.startBatch(p.id, input);
  assert.equal(resumed.jobIds.length, 1);
  await until(
    async () =>
      (await service.store.getJob(resumed.jobIds[0])).status === "completed",
  );
});

test("changed output size invalidates project render and reuses completed montage without AI", async (t) => {
  let edits = 0;
  const { service, root } = await fixture(t, {
    editReel: async () => {
      edits++;
    },
  });
  const p = await created(service);
  const process = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () =>
      (await service.store.getJob(process.jobId)).status === "completed",
  );
  let current = await service.project(p.id);
  const first = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "first-size",
  });
  await until(
    async () =>
      (await service.store.getJob(first.jobIds[0])).status === "completed",
  );
  current = await service.project(p.id);
  assert.equal(current.candidates[0].isCurrent, true);
  await request(service, "PUT", `/api/quickcontent/projects/${p.id}/output`, {
    expectedRevision: current.revision,
    outputResolution: 720,
  });
  current = await service.project(p.id);
  assert.equal(current.candidates[0].isCurrent, false);
  const next = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "second-size",
  });
  assert.equal(next.jobIds.length, 1);
  await until(
    async () =>
      (await service.store.getJob(next.jobIds[0])).status === "completed",
  );
  assert.equal(edits, 1);
  assert.equal(
    JSON.parse(
      await fs.readFile(path.join(root, "public/reels/qc-c-one/reel.json")),
    ).outputResolution,
    720,
  );
  assert.equal((await service.project(p.id)).candidates[0].isCurrent, true);
});

test("project operator defaults to Codex account and can explicitly select API without changing source or selection", async (t) => {
  const { service } = await fixture(t);
  const p = await created(service);
  assert.equal(p.aiProvider, "codex");
  const updated = (
    await request(
      service,
      "PUT",
      `/api/quickcontent/projects/${p.id}/operator`,
      { expectedRevision: p.revision, aiProvider: "openai" },
    )
  ).body;
  assert.equal(updated.aiProvider, "openai");
  assert.deepEqual(updated.selectedCandidateIds, p.selectedCandidateIds);
  await assert.rejects(
    request(service, "PUT", `/api/quickcontent/projects/${p.id}/operator`, {
      expectedRevision: updated.revision,
      aiProvider: "unknown",
    }),
  );
});
test("null AI montage preserves existing draft and reports actionable error", async (t) => {
  const { service, root } = await fixture(t, {
    editReel: null,
    requestAI: async () => ({ data: null, summary: "Cannot access files" }),
  });
  const p = await created(service);
  const job = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(job.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  const batch = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "null-data",
  });
  await until(
    async () =>
      (await service.store.getJob(batch.jobIds[0])).status === "failed",
  );
  assert.match(
    (await service.store.getJob(batch.jobIds[0])).error,
    /nie zwrócił poprawnego montażu/,
  );
  assert.equal(
    JSON.parse(
      await fs.readFile(path.join(root, "public/reels/qc-c-one/reel.json")),
    ).captions[0].words[0].text,
    "test",
  );
});

test("cancelled waiting montage is shown as cancelled in project instead of a permanent queue", async (t) => {
  let release;
  const waiting = new Promise((r) => {
    release = r;
  });
  const { service } = await fixture(t, { editReel: async () => waiting });
  try {
    const p = await created(service);
    const job = (
      await request(
        service,
        "POST",
        `/api/quickcontent/projects/${p.id}/process`,
        {},
      )
    ).body;
    await until(
      async () =>
        (await service.store.getJob(job.jobId)).status === "completed",
    );
    const current = await service.project(p.id);
    const batch = await service.startBatch(p.id, {
      candidateIds: ["c-one", "c-two"],
      expectedRevision: current.revision,
      idempotencyKey: "cancel-waiting",
    });
    await service.worker.cancel(batch.jobIds[1]);
    assert.equal(
      (await service.project(p.id)).candidates.find((c) => c.id === "c-two")
        .status,
      "cancelled",
    );
  } finally {
    release();
  }
});

test("a rebranded reel uses its actual client preferences for later AI corrections", async (t) => {
  let prompt = "";
  const { service, root } = await fixture(t, {
    editReel: null,
    requestAI: async (request) => {
      prompt = request.prompt;
      return {
        summary: "OK",
        data: { captions: null, segments: null },
        overlaysToAdd: [],
        overlaysToRemove: [],
      };
    },
  });
  const p = await created(service);
  const job = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(job.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  const batch = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "rebrand",
  });
  await until(
    async () =>
      (await service.store.getJob(batch.jobIds[0])).status === "completed",
  );
  await fs.mkdir(path.join(root, "klienci/kacper-bisanz"), { recursive: true });
  await fs.writeFile(path.join(root, "src/styles/bisanz.tsx"), "style");
  await fs.writeFile(
    path.join(root, "klienci/kacper-bisanz/PREFERENCJE.md"),
    "BISANZ BLUE #066FED",
  );
  const file = path.join(root, "public/reels/qc-c-one/reel.json");
  const data = JSON.parse(await fs.readFile(file));
  data.style = "bisanz";
  data.client = "kacper-bisanz";
  await fs.writeFile(file, JSON.stringify(data));
  const chat = await service.bridgeReelJob({
    method: "POST",
    reelName: "qc-c-one",
    body: { kind: "chat", message: "Popraw napisy", render: false },
  });
  await until(
    async () => (await service.store.getJob(chat.jobId)).status === "completed",
  );
  assert.match(prompt, /BISANZ BLUE #066FED/);
});

test("publication copy runs after verified video and its failure does not discard the film", async (t) => {
  let copyCalls = 0;
  const { service } = await fixture(t, {
    generateReelDescription: async () => {
      copyCalls++;
      throw Error("API unavailable");
    },
  });
  const p = await created(service);
  const job = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(job.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  const b = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "copy-after-render",
  });
  await until(
    async () =>
      (await service.store.getJob(b.jobIds[0])).status === "completed",
  );
  assert.equal(copyCalls, 1);
  assert.equal((await service.project(p.id)).candidates[0].isCurrent, true);
});

test("editing speech during render skips paid description for the older MP4", async (t) => {
  let copyCalls = 0;
  const { service } = await fixture(t, {
    generateReelDescription: async () => {
      copyCalls++;
      return { status: "ready" };
    },
    renderReelSnapshot: async ({ reelName, data, editRevision }, ctx) => {
      const filePath = `out/${reelName}-v001.mp4`;
      await fs.mkdir(path.join(ctx.root, "out"), { recursive: true });
      await fs.writeFile(path.join(ctx.root, filePath), "verified MP4");
      const signature = await service.signature(reelName, data);
      const edited = globalThis.structuredClone(data);
      edited.captions[0].words[0].text = "nowszy tekst";
      await fs.writeFile(
        path.join(ctx.root, "public/reels", reelName, "reel.json"),
        JSON.stringify(edited),
      );
      return {
        filePath,
        renderRevision: editRevision,
        verified: true,
        signature,
      };
    },
  });
  const p = await created(service);
  const job = (
    await request(
      service,
      "POST",
      `/api/quickcontent/projects/${p.id}/process`,
      {},
    )
  ).body;
  await until(
    async () => (await service.store.getJob(job.jobId)).status === "completed",
  );
  const current = await service.project(p.id);
  const b = await service.startBatch(p.id, {
    candidateIds: ["c-one"],
    expectedRevision: current.revision,
    idempotencyKey: "copy-stale-render",
  });
  await until(
    async () =>
      (await service.store.getJob(b.jobIds[0])).status === "completed",
  );
  assert.equal(copyCalls, 0);
  assert.equal((await service.project(p.id)).candidates[0].isCurrent, false);
});
