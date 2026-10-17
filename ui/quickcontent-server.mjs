import {serveMedia} from "./media-response.mjs";
export {parseRange} from "./media-response.mjs";
import {
  generateReelDescription,
  readReelDescription,
} from "../scripts/reel-description.mjs";
import { validTracking } from "../src/quickcontent/framing.mjs";
import fs from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createStore, qcError } from "../scripts/quickcontent-store.mjs";
import { createWorker } from "../scripts/quickcontent-worker.mjs";
import {
  acceptUpload,
  ingestSource,
  safePath,
  writeMediaJson,
} from "../scripts/quickcontent-ingest.mjs";
import { transcribeSource } from "../scripts/quickcontent-transcribe.mjs";
import {
  analyzeTranscript,
  analysisSettingsKey,
} from "../scripts/quickcontent-analyze.mjs";
import { materializeCandidate } from "../scripts/quickcontent-adapter.mjs";
import {
  renderReelSnapshot,
  renderInputSignature,
  isCurrentRender,
} from "../scripts/quickcontent-render.mjs";
import { isName } from "./lib.mjs";
import {
  montageRequest,
  applyEditResult,
} from "../scripts/quickcontent-edit.mjs";
import {
  requestQuickContentAI,
  operatorStatuses,
} from "../scripts/quickcontent-ai.mjs";
import {
  summarizeCosts,
  summarizeCandidateCosts,
} from "../scripts/quickcontent-costs.mjs";
import {
  OutputResolutionSchema,
  DescriptionInstructionsSchema,
} from "../src/quickcontent/schema.mjs";
import { tryAcquireHeavy } from "./process-resource.mjs";

const terminal = new Set([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
  "blocked",
]);
const hashData = (data) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
export function installQuickContentLifecycle(server, worker) {
  worker
    .recover()
    .catch((e) => server.config.logger.warn(`QuickContent: ${e.message}`));
  for (const method of ["restart", "close"]) {
    const original = server[method].bind(server);
    server[method] = async (...args) => {
      await worker.close();
      return original(...args);
    };
  }
  server.httpServer?.once("close", () => worker.close().catch(() => {}));
}
const send = (res, value, status = 200) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
  return true;
};
async function jsonBody(req) {
  let size = 0;
  const bytes = [];
  for await (const b of req) {
    const chunk = Buffer.from(b);
    size += chunk.length;
    if (size > 1024 * 1024) throw qcError("Za duży JSON", 413);
    bytes.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(bytes).toString() || "{}");
  } catch {
    throw qcError("Niepoprawny JSON");
  }
}
export function createQuickContentService(
  root,
  { providers = {}, isBusy = () => false } = {},
) {
  root = path.resolve(root);
  const store = createStore(root);
  const saves = new Map();
  const signature =
    providers.signature ??
    ((name, data) => renderInputSignature(root, name, data));
  const provider = {
    ingestSource,
    transcribeSource,
    analyzeTranscript,
    materializeCandidate,
    renderReelSnapshot,
    generateReelDescription,
    ...providers,
  };
  const change = async (id, fn) => {
    if (store.updateProject) return store.updateProject(id, fn);
    for (let i = 0; i < 20; i++) {
      const p = await store.getProject(id);
      if (!p) throw qcError("Brak projektu", 404);
      try {
        return await store.mutateProject(id, p.revision, fn);
      } catch (e) {
        if (e.status !== 409) throw e;
      }
    }
    throw qcError("Projekt jest zajęty; ponów zapis", 409);
  };
  const get = async (id) => {
    const p = await store.getProject(id);
    if (!p) throw qcError("Nie znaleziono projektu", 404);
    return p;
  };
  async function transcriptOf(p, ctx) {
    if (p.transcript?.wordsPath) {
      const file = await safePath(root, p.transcript.wordsPath);
      const d = JSON.parse(await fs.readFile(file, "utf8"));
      return { ...d, ...p.transcript, duration: p.source.duration };
    }
    return {
      ...(await provider.transcribeSource(
        p.source,
        { model: "large-v3-turbo", language: "pl" },
        ctx,
      )),
      duration: p.source.duration,
    };
  }
  async function makeThumbnail(p, c, ctx) {
    if (provider.makeThumbnail) return provider.makeThumbnail(p, c, ctx);
    const rel = `${p.source.dataDir}/thumbnails/${c.id}.jpg`,
      file = await safePath(root, rel, { create: true });
    await ctx.runTool(
      "ffmpeg",
      [
        "-hide_banner",
        "-v",
        "error",
        "-y",
        "-ss",
        String(c.sourceStart),
        "-i",
        await safePath(root, p.source.proxyPath),
        "-frames:v",
        "1",
        "-vf",
        "scale=480:-2",
        file,
      ],
      { cwd: root },
    );
    return rel;
  }
  async function analysis(payload, ctx, initial) {
    let p = await get(payload.projectId);
    ctx = { ...ctx, aiProvider: p.aiProvider };
    if (initial && !p.source) {
      const source = await provider.ingestSource(p, ctx);
      p = await change(p.id, (d) => ({
        ...d,
        source,
        title: source.title || d.title,
      }));
    }
    if (!p.source) throw qcError("Najpierw przetwórz źródło");
    const transcript = await transcriptOf(p, ctx);
    if (!p.transcript)
      p = await change(p.id, (d) => ({
        ...d,
        transcript: {
          rawPath: transcript.rawPath,
          wordsPath: transcript.wordsPath,
          hash: transcript.hash,
          status: transcript.status,
        },
      }));
    const settings = payload.settings ?? {
      focus: p.focus,
      duration: p.duration,
    };
    if (transcript.status === "no-speech" || !transcript.words.length) {
      await change(p.id, (d) => ({ ...d, status: "no-speech" }));
      return { noSpeech: true };
    }
    const result = await provider.analyzeTranscript(
      {
        project: { ...p, ...settings },
        transcript,
        previousCandidates: p.candidates,
        analysisRunId: payload.analysisRunId,
      },
      ctx,
    );
    for (const c of result.candidates) {
      ctx.signal.throwIfAborted();
      c.thumbnailPath = await makeThumbnail(p, c, ctx);
    }
    await change(p.id, (d) => ({
      ...d,
      status: "proposals",
      analysisRuns: [...d.analysisRuns, result.run],
      candidates: [...d.candidates, ...result.candidates],
    }));
    const dir = await store.projectDirectory(p);
    const file = path.join(dir, "analysis", result.run.id + ".json");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeMediaJson(file, result);
    await ctx.checkpoint("analyze", [file]);
    return {
      analysisRunId: result.run.id,
      candidates: result.candidates.length,
    };
  }
  async function originOf(reelName) {
    if (!isName(reelName)) throw qcError("Nieprawidłowa nazwa rolki");
    const file = await safePath(root, `public/reels/${reelName}/origin.json`);
    let o;
    try {
      o = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw qcError("Uszkodzony origin rolki", 409);
    }
    if (o.kind !== "quickcontent" || !o.projectId || !o.candidateId)
      throw qcError("Nieprawidłowy origin rolki", 409);
    const p = await get(o.projectId);
    if (
      !p.candidates.some(
        (c) => c.id === o.candidateId && c.reelName === reelName,
      )
    )
      throw qcError("Origin nie zgadza się z projektem", 409);
    return o;
  }
  async function reconcileReel(reelName) {
    const o = await originOf(reelName);
    if (!o) return null;
    const file = await safePath(root, `public/reels/${reelName}/reel.json`),
      data = JSON.parse(await fs.readFile(file, "utf8"));
    const hash = hashData(data);
    const p = await get(o.projectId),
      c = p.candidates.find((c) => c.id === o.candidateId);
    if (c.editHash === hash) return c;
    const updated = await change(p.id, (d) => ({
      ...d,
      candidates: d.candidates.map((c) =>
        c.id === o.candidateId
          ? {
              ...c,
              editHash: hash,
              editRevision: c.editHash ? c.editRevision + 1 : c.editRevision,
            }
          : c,
      ),
    }));
    return updated.candidates.find((c) => c.id === o.candidateId);
  }
  async function withReel(reelName, fn) {
    const previous = saves.get(reelName) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(fn);
    saves.set(reelName, task);
    try {
      return await task;
    } finally {
      if (saves.get(reelName) === task) saves.delete(reelName);
    }
  }
  async function readEditedReel(reelName) {
    if (!(await originOf(reelName))) return null;
    return withReel(reelName, async () => {
      const current = await reconcileReel(reelName);
      return {
        data: JSON.parse(
          await fs.readFile(
            await safePath(root, `public/reels/${reelName}/reel.json`),
            "utf8",
          ),
        ),
        editRevision: current.editRevision,
      };
    });
  }
  async function saveEditedReel(reelName, data, expectedRevision) {
    const origin = await originOf(reelName);
    if (!origin) return null;
    return withReel(reelName, async () => {
      const current = await reconcileReel(reelName);
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision !== current.editRevision
      )
        throw qcError(
          "Rolka zmieniła się — wczytaj aktualną wersję przed zapisem",
          409,
        );
      const job = await bridgeReelJob({ method: "GET", reelName });
      if (job?.status === "running" && job.kind !== "render")
        throw qcError(
          "QuickContent pracuje nad tą rolką — poczekaj albo zatrzymaj zadanie",
          409,
        );
      const file = await safePath(root, `public/reels/${reelName}/reel.json`),
        before = JSON.parse(await fs.readFile(file, "utf8"));
      validateEditedData(before, data);
      const history = path.join(path.dirname(file), "historia");
      await fs.mkdir(history, { recursive: true });
      await writeMediaJson(
        path.join(history, Date.now() + "-" + randomUUID() + ".json"),
        before,
      );
      await writeMediaJson(file, data);
      return {
        ok: true,
        editRevision: (await reconcileReel(reelName)).editRevision,
      };
    });
  }
  async function editReel(reelName, message, ctx) {
    if (provider.editReel) return provider.editReel(reelName, message, ctx);
    const p = await get((await originOf(reelName)).projectId);
    const reelDir = await safePath(root, `public/reels/${reelName}/reel.json`);
    const data = JSON.parse(await fs.readFile(reelDir, "utf8"));
    let template = p.templateSnapshot;
    if (
      data.style !== template.styleId ||
      (data.client ?? null) !== (template.clientId ?? null)
    ) {
      const profile = (await store.getTemplates(data.client ?? null)).find(
        (t) => t.styleId === data.style && t.ready,
      );
      if (!profile)
        throw qcError("Brak gotowego profilu klienta dla tej rolki");
      template = {
        ...profile,
        preferences: {
          general: await fs.readFile(
            await safePath(root, "PREFERENCJE.md"),
            "utf8",
          ),
          client: data.client
            ? await fs.readFile(
                await safePath(root, `klienci/${data.client}/PREFERENCJE.md`),
                "utf8",
              )
            : null,
        },
      };
    }
    const request = montageRequest(data, template, message);
    await ctx.report({ stage: "montage", progress: null });
    const result = applyEditResult(
      data,
      await (provider.requestAI ?? requestQuickContentAI)(request, ctx),
    );
    if (result.data.style === "bisanz")
      result.data.segments = result.data.segments.map((s) => ({
        ...s,
        zoom: 1,
        zoomTo: 1,
      }));
    validateEditedData(data, result.data);
    const history = path.join(path.dirname(reelDir), "historia");
    await fs.mkdir(history, { recursive: true });
    await writeMediaJson(path.join(history, Date.now() + ".json"), data);
    await writeMediaJson(reelDir, result.data);
    await store.appendEvent(ctx.jobId, {
      message: result.summary || "Montaż zaktualizowany",
    });
    const chatFile = path.join(path.dirname(reelDir), "quickcontent-chat.json");
    const previous = JSON.parse(
      await fs.readFile(chatFile, "utf8").catch(() => "[]"),
    );
    previous.push({
      message: message || "Pełny montaż",
      summary: result.summary || "",
      at: new Date().toISOString(),
    });
    await writeMediaJson(chatFile, previous);
  }
  async function sync() {
    if (provider.syncStudio) return provider.syncStudio();
    const { syncStudio } = await import("../scripts/studio-sync.mjs");
    syncStudio(root);
  }
  async function montage(payload, ctx) {
    const { projectId, candidateId } = payload;
    let p = await get(projectId),
      c = p.candidates.find((c) => c.id === candidateId);
    if (!c) throw qcError("Obca propozycja");
    ctx = { ...ctx, aiProvider: p.aiProvider };
    try {
      if (!c.reelName) {
        await change(p.id, (d) => ({
          ...d,
          candidates: d.candidates.map((v) =>
            v.id === c.id ? { ...v, status: "materializing" } : v,
          ),
        }));
        const transcript = await transcriptOf(p, ctx);
        const materialized = await provider.materializeCandidate(
          {
            project: {
              ...p,
              styleId: p.templateSnapshot.styleId,
              template: p.templateSnapshot,
            },
            candidate: c,
            transcript,
          },
          ctx,
        );
        await change(p.id, (d) => ({
          ...d,
          candidates: d.candidates.map((v) =>
            v.id === c.id
              ? {
                  ...v,
                  reelName: materialized.reelName,
                  editHash: hashData(materialized.data),
                }
              : v,
          ),
        }));
        await sync();
        c = (await get(p.id)).candidates.find((v) => v.id === c.id);
      }
      {
        const reelFile = await safePath(
          root,
          `public/reels/${c.reelName}/reel.json`,
        );
        const reelData = JSON.parse(await fs.readFile(reelFile, "utf8"));
        const outputResolution = OutputResolutionSchema.parse(
          payload.outputResolution ?? p.outputResolution ?? 1080,
        );
        if (reelData.outputResolution !== outputResolution) {
          await writeMediaJson(reelFile, { ...reelData, outputResolution });
          await reconcileReel(c.reelName);
        }
      }
      if (payload.action !== "render" && !ctx.checkpoints["ai-edit"]) {
        await change(p.id, (d) => ({
          ...d,
          candidates: d.candidates.map((v) =>
            v.id === c.id ? { ...v, status: "montaging" } : v,
          ),
        }));
        try {
          await editReel(c.reelName, payload.message, ctx);
        } finally {
          await reconcileReel(c.reelName);
        }
        const completionRel = `.quickcontent/ai-edits/${ctx.jobId}.json`;
        await writeMediaJson(
          await safePath(root, completionRel, { create: true }),
          {
            jobId: ctx.jobId,
            reelName: c.reelName,
            completedAt: new Date().toISOString(),
          },
        );
        await ctx.checkpoint("ai-edit", [completionRel]);
        await change(p.id, (d) => ({
          ...d,
          candidates: d.candidates.map((v) =>
            v.id === c.id ? { ...v, aiCompletedJobId: ctx.jobId } : v,
          ),
        }));
        await sync();
      }
      if (payload.action === "chat" && !payload.render) {
        await change(p.id, (d) => ({
          ...d,
          candidates: d.candidates.map((v) =>
            v.id === c.id ? { ...v, status: "proposed" } : v,
          ),
        }));
        return { reelName: c.reelName };
      }
      await ctx.report({ stage: "review", progress: null });
      const file = await safePath(root, `public/reels/${c.reelName}/reel.json`);
      const data = JSON.parse(await fs.readFile(file, "utf8"));
      validateEditedData(data, data);
      if (
        !provider.renderReelSnapshot ||
        provider.renderReelSnapshot === renderReelSnapshot
      ) {
        for (const frame of [
          0,
          Math.round(
            (data.segments.reduce((n, s) => n + s.end - s.start, 0) *
              (data.fps ?? 30)) /
              2,
          ),
        ]) {
          ctx.signal.throwIfAborted();
          await ctx.runTool(
            "npx",
            [
              "remotion",
              "still",
              "src/quickcontent/index.ts",
              "QuickContentRender",
              path.join(path.dirname(file), `review-${frame}.png`),
              "--frame",
              String(frame),
              "--props",
              JSON.stringify({ reel: c.reelName, data }),
            ],
            { cwd: root, maxBuffer: 2 * 1024 * 1024 },
          );
        }
      }
      c = await reconcileReel(c.reelName);
      await change(p.id, (d) => ({
        ...d,
        candidates: d.candidates.map((v) =>
          v.id === c.id ? { ...v, status: "rendering" } : v,
        ),
      }));
      const render = await provider.renderReelSnapshot(
        {
          reelName: c.reelName,
          data: globalThis.structuredClone(data),
          editRevision: c.editRevision,
        },
        ctx,
      );
      await change(p.id, (d) => ({
        ...d,
        candidates: d.candidates.map((v) =>
          v.id === c.id
            ? { ...v, status: "completed", renders: [...v.renders, render] }
            : v,
        ),
      }));
      try {
        await ctx.report({
          stage: "description",
          progress: null,
          progressDetail:
            "Gotowy film zapisany. Przygotowanie opisu przez GPT‑6 Luna API",
        });
        const latest = await readEditedReel(c.reelName);
        const stillCurrent = isCurrentRender(
          render,
          latest.editRevision,
          await signature(c.reelName, latest.data),
        );
        const publication = stillCurrent
          ? await provider.generateReelDescription(c.reelName, {
              ...ctx,
              renderedData: data,
              descriptionInstructions: (await get(p.id))
                .descriptionInstructions,
            })
          : { status: "stale" };
        if (publication.status !== "ready")
          await store.appendEvent(ctx.jobId, {
            message:
              "Film gotowy; opis wymaga ponowienia w zakładce Zmontowane.",
          });
      } catch {
        await store.appendEvent(ctx.jobId, {
          message: "Film gotowy; opis wymaga ponowienia w zakładce Zmontowane.",
        });
      }
      return { reelName: c.reelName, filePath: render.filePath };
    } catch (error) {
      await change(p.id, (d) => ({
        ...d,
        candidates: d.candidates.map((v) =>
          v.id === c.id
            ? { ...v, status: ctx.signal.aborted ? "cancelled" : "failed" }
            : v,
        ),
      }));
      throw error;
    }
  }
  const worker = createWorker({
    root,
    store,
    handlers: {
      process: (p, c) => analysis(p, c, true),
      "find-more": (p, c) => analysis(p, c, false),
      montage,
    },
    isBusy,
    acquire: () => tryAcquireHeavy("QuickContent"),
  });
  async function project(id) {
    let p = await get(id);
    const jobs = (await store.listJobs()).filter((j) => j.projectId === id);
    const candidates = [];
    for (const c of p.candidates) {
      let currentRender = null;
      if (c.reelName) {
        await reconcileReel(c.reelName);
        p = await get(id);
        const current = p.candidates.find((v) => v.id === c.id);
        Object.assign(c, current);
        const data = JSON.parse(
          await fs.readFile(
            await safePath(root, `public/reels/${c.reelName}/reel.json`),
            "utf8",
          ),
        );
        const sig = await signature(c.reelName, data);
        for (const r of c.renders) {
          if (
            (data.outputResolution ?? 1080) === (p.outputResolution ?? 1080) &&
            isCurrentRender(r, c.editRevision, sig) &&
            (await fs.stat(await safePath(root, r.filePath)).catch(() => null))
          )
            currentRender = r;
        }
      }
      const lastJob = jobs.filter((j) => j.candidateId === c.id).at(-1);
      const waitingStatus = [
        "queued",
        "materializing",
        "montaging",
        "reviewing",
        "rendering",
      ].includes(c.status);
      const publication = c.reelName
        ? await readReelDescription(c.reelName, root).catch(() => null)
        : null;
      candidates.push({
        ...c,
        ...(waitingStatus &&
        ["cancelled", "interrupted", "failed"].includes(lastJob?.status)
          ? { status: lastJob.status === "failed" ? "failed" : "cancelled" }
          : {}),
        isCurrent: Boolean(currentRender),
        currentRender,
        publication,
        costs: summarizeCandidateCosts(jobs, c.id, publication?.usage ?? []),
      });
    }
    const batches = (p.batches ?? []).map((b) => ({
      ...b,
      completed: b.candidateIds.filter(
        (id) => candidates.find((c) => c.id === id)?.isCurrent,
      ).length,
      failed: b.jobIds.filter(
        (id) => jobs.find((j) => j.id === id)?.status === "failed",
      ).length,
      cancelled: b.jobIds.filter((id) =>
        ["cancelled", "interrupted"].includes(
          jobs.find((j) => j.id === id)?.status,
        ),
      ).length,
    }));
    return {
      ...p,
      candidates,
      jobs,
      batches,
      costs: summarizeCosts(
        jobs,
        candidates.flatMap((c) => c.publication?.usage ?? []),
      ),
      jobIds: jobs.map((j) => j.id),
    };
  }
  async function startBatch(projectId, b) {
    const p = await get(projectId),
      existing = (p.batches ?? []).find(
        (v) => v.idempotencyKey === b.idempotencyKey,
      );
    if (existing) {
      if (
        JSON.stringify(existing.candidateIds) !== JSON.stringify(b.candidateIds)
      )
        throw qcError("Klucz montażu użyty dla innego wyboru", 409);
    }
    if (
      !Array.isArray(b.candidateIds) ||
      !b.candidateIds.length ||
      new Set(b.candidateIds).size !== b.candidateIds.length ||
      b.candidateIds.some((id) => !p.candidates.some((c) => c.id === id))
    )
      throw qcError("Zaznacz własne propozycje");
    if (
      typeof b.idempotencyKey !== "string" ||
      !b.idempotencyKey ||
      b.idempotencyKey.length > 120
    )
      throw qcError("Brak klucza montażu");
    const batch = existing ?? {
      id: "batch-" + randomUUID(),
      candidateIds: b.candidateIds.slice(),
      jobIds: [],
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: b.candidateIds.length,
      idempotencyKey: b.idempotencyKey,
      outputResolution: p.outputResolution ?? 1080,
    };
    if (!existing)
      await store.mutateProject(p.id, b.expectedRevision, (d) => ({
        ...d,
        batchIds: [...d.batchIds, batch.id],
        batches: [...(d.batches ?? []), batch],
        candidates: d.candidates.map((c) =>
          b.candidateIds.includes(c.id) ? { ...c, status: "queued" } : c,
        ),
      }));
    batch.jobIds = [];
    for (const id of b.candidateIds) {
      const c = (await project(p.id)).candidates.find((c) => c.id === id);
      const prior = (await store.listJobs()).find(
        (j) =>
          j.projectId === p.id &&
          j.candidateId === id &&
          j.idempotencyKey === b.idempotencyKey + ":" + id,
      );
      if (prior) {
        batch.jobIds.push(prior.id);
        await change(p.id, (d) => ({
          ...d,
          batches: d.batches.map((v) =>
            v.id === batch.id ? { ...v, jobIds: batch.jobIds.slice() } : v,
          ),
        }));
        continue;
      }
      if (c.isCurrent) continue;
      const active = (await store.listJobs()).find(
        (j) =>
          j.projectId === p.id &&
          j.candidateId === id &&
          !terminal.has(j.status),
      );
      if (active) {
        batch.jobIds.push(active.id);
        continue;
      }
      const job = await worker.enqueue(
        "montage",
        {
          projectId: p.id,
          candidateId: id,
          batchId: batch.id,
          outputResolution: batch.outputResolution,
          action: c.aiCompletedJobId || c.renders.length ? "render" : "montage",
        },
        { idempotencyKey: b.idempotencyKey + ":" + id },
      );
      batch.jobIds.push(job.id);
      await change(p.id, (d) => ({
        ...d,
        batches: d.batches.map((v) =>
          v.id === batch.id ? { ...v, jobIds: batch.jobIds.slice() } : v,
        ),
      }));
    }
    await change(p.id, (d) => ({
      ...d,
      batches: d.batches.map((v) =>
        v.id === batch.id ? { ...v, jobIds: batch.jobIds } : v,
      ),
    }));
    return { batchId: batch.id, jobIds: batch.jobIds };
  }
  async function bridgeReelJob({ method, reelName, body = {}, cursor = 0 }) {
    const o = await originOf(reelName);
    if (!o) return null;
    if (method === "POST") {
      if (!["montage", "render", "chat"].includes(body.kind))
        throw qcError("Nieznany rodzaj zadania");
      if (body.kind === "chat" && !String(body.message ?? "").trim())
        throw qcError("Napisz poprawkę");
      if (
        (await store.listJobs()).some(
          (j) =>
            j.projectId === o.projectId &&
            j.candidateId === o.candidateId &&
            !terminal.has(j.status),
        )
      )
        throw qcError("Rolka ma trwające zadanie", 409);
      const job = await worker.enqueue("montage", {
        projectId: o.projectId,
        candidateId: o.candidateId,
        action: body.kind,
        message: body.message ?? null,
        render:
          body.kind === "chat"
            ? Boolean(
                body.render ||
                /\b(?:wyrenderuj|renderuj|render)\b/i.test(body.message),
              )
            : true,
      });
      return { ok: true, jobId: job.id };
    }
    const jobs = (await store.listJobs()).filter(
        (j) => j.projectId === o.projectId && j.candidateId === o.candidateId,
      ),
      job = jobs.at(-1);
    if (method === "DELETE") {
      if (job) await worker.cancel(job.id);
      return { ok: true };
    }
    if (!job) return { status: "idle" };
    const events = await store.loadEvents(job.id, Number(cursor) || 0),
      kind =
        job.stage === "render" || job.payload.action === "render"
          ? "render"
          : job.payload.action === "chat"
            ? "chat"
            : "montage";
    return {
      kind,
      status: ["running", "queued"].includes(job.status)
        ? "running"
        : job.status === "completed"
          ? "done"
          : ["cancelled", "interrupted"].includes(job.status)
            ? "stopped"
            : "error",
      lines: events.events
        .map((e) => e.message || e.error || e.stage || e.status)
        .filter(Boolean),
      next: events.cursor,
      pct: job.progress === null ? null : Math.round(job.progress * 100),
      result: job.artifactReferences?.filePath ?? null,
    };
  }
  async function route(req, res, url) {
    const parts = url.pathname
      .replace(/^\/api/, "")
      .split("/")
      .filter(Boolean);
    if (parts[0] !== "quickcontent") return false;
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? ""))
      throw qcError("Panel działa tylko lokalnie", 403);
    if (
      !["GET", "HEAD"].includes(req.method) &&
      (req.headers["x-panel"] !== "1" ||
        (req.headers.origin !== undefined &&
          req.headers.origin !== `http://${req.headers.host}`))
    )
      throw qcError("Żądanie musi pochodzić z panelu", 403);
    const [, resource, id, action, asset] = parts,
      m = req.method;
    if (resource === "instance" && m === "GET")
      return send(res, { root: await fs.realpath(root) });
    if (resource === "templates" && m === "GET")
      return send(res, await store.getTemplates());
    if (resource === "reels" && id && m === "GET") {
      const origin = await originOf(id);
      if (!origin) return send(res, null);
      const p = await project(origin.projectId);
      return send(res, {
        projectId: p.id,
        projectTitle: p.title,
        aiProvider: p.aiProvider,
        candidateId: origin.candidateId,
        candidate: p.candidates.find((c) => c.id === origin.candidateId),
      });
    }
    if (resource === "uploads" && m === "POST")
      return send(
        res,
        await acceptUpload(req, {
          root,
          fileName: url.searchParams.get("file"),
        }),
      );
    if (resource === "projects" && !id && m === "GET")
      return send(
        res,
        await Promise.all(
          (await store.listProjects()).map((p) => project(p.id)),
        ),
      );
    if (resource === "projects" && !id && m === "POST")
      return send(res, await store.createProject(await jsonBody(req)), 201);
    if (resource === "operators" && m === "GET")
      return send(
        res,
        await (provider.operatorStatuses ?? operatorStatuses)(root),
      );
    if (resource === "projects" && id) {
      const p = await get(id);
      if (!action && m === "GET") return send(res, await project(id));
      if (
        (action === "description" && m === "PUT") ||
        (!action && m === "PATCH")
      ) {
        const b = await jsonBody(req);
        if (typeof b.descriptionInstructions !== "string")
          throw qcError("Wpisz wskazówki opisu jako tekst.");
        const descriptionInstructions = DescriptionInstructionsSchema.parse(
          b.descriptionInstructions,
        );
        if (
          (await store.listJobs()).some(
            (j) =>
              j.projectId === id &&
              j.kind === "montage" &&
              !terminal.has(j.status),
          )
        )
          throw qcError(
            "Poczekaj na zakończenie montażu przed zmianą wskazówek opisu.",
            409,
          );
        return send(
          res,
          await store.mutateProject(id, b.expectedRevision, (d) => ({
            ...d,
            descriptionInstructions,
          })),
        );
      }
      if (action === "operator" && m === "PUT") {
        const b = await jsonBody(req);
        if (!["codex", "claude", "openai"].includes(b.aiProvider))
          throw qcError("Wybierz Codex, Claude Code lub OpenAI API");
        if (
          (await store.listJobs()).some(
            (j) => j.projectId === id && !terminal.has(j.status),
          )
        )
          throw qcError(
            "Poczekaj na zakończenie zadania przed zmianą operatora",
            409,
          );
        return send(
          res,
          await store.mutateProject(id, b.expectedRevision, (d) => ({
            ...d,
            aiProvider: b.aiProvider,
          })),
        );
      }
      if (action === "output" && m === "PUT") {
        const b = await jsonBody(req);
        const outputResolution = OutputResolutionSchema.parse(
          b.outputResolution,
        );
        if (
          (await store.listJobs()).some(
            (j) =>
              j.projectId === id &&
              j.kind === "montage" &&
              !terminal.has(j.status),
          )
        )
          throw qcError(
            "Poczekaj na zakończenie montażu przed zmianą rozdzielczości.",
            409,
          );
        return send(
          res,
          await store.mutateProject(id, b.expectedRevision, (d) => ({
            ...d,
            outputResolution,
          })),
        );
      }
      if (action === "process" && m === "POST") {
        const active = (await store.listJobs()).find(
          (j) =>
            j.projectId === id &&
            j.kind === "process" &&
            !terminal.has(j.status),
        );
        if (active) return send(res, { jobId: active.id });
        const job = await worker.enqueue("process", { projectId: id });
        return send(res, { jobId: job.id });
      }
      if (action === "selection" && m === "PUT") {
        const b = await jsonBody(req);
        if (
          !Array.isArray(b.candidateIds) ||
          b.candidateIds.some((v) => !p.candidates.some((c) => c.id === v)) ||
          new Set(b.candidateIds).size !== b.candidateIds.length
        )
          throw qcError("Wybór zawiera obcą propozycję");
        return send(
          res,
          await store.mutateProject(id, b.expectedRevision, (d) => ({
            ...d,
            selectedCandidateIds: b.candidateIds,
          })),
        );
      }
      if (action === "find-more" && m === "POST") {
        const b = await jsonBody(req);
        if (p.revision !== b.expectedRevision)
          throw qcError("Projekt zmienił się — odśwież", 409);
        const active = (await store.listJobs()).find(
          (j) =>
            j.projectId === id &&
            ["process", "find-more"].includes(j.kind) &&
            !terminal.has(j.status),
        );
        if (active)
          return send(res, {
            jobId: active.id,
            analysisRunId: active.payload.analysisRunId,
          });
        const settings = {
          focus: b.focus ?? p.focus,
          duration: b.duration ?? p.duration,
        };
        const { FocusSchema, DurationSchema } =
          await import("../src/quickcontent/schema.mjs");
        FocusSchema.parse(settings.focus);
        DurationSchema.parse(settings.duration);
        const key = analysisSettingsKey(settings);
        if (p.analysisRuns.some((r) => r.settingsKey === key && r.exhausted))
          throw qcError(
            "Brak kolejnych pełnych fragmentów. Zmień temat lub długość.",
            409,
          );
        const analysisRunId = "a-" + randomUUID();
        const job = await worker.enqueue("find-more", {
          projectId: id,
          settings,
          analysisRunId,
        });
        return send(res, { jobId: job.id, analysisRunId });
      }
      if (action === "montage" && m === "POST")
        return send(res, await startBatch(id, await jsonBody(req)));
      if (action === "media" && ["GET", "HEAD"].includes(m)) {
        if (asset === "proxy" && p.source)
          return serveMedia(
            req,
            res,
            await safePath(root, p.source.proxyPath),
            "video/mp4",
          );
        if (asset === "thumbnails") {
          const c = p.candidates.find((c) => c.id === parts[5]);
          if (!c?.thumbnailPath) throw qcError("Brak miniatury", 404);
          return serveMedia(
            req,
            res,
            await safePath(root, c.thumbnailPath),
            "image/jpeg",
          );
        }
      }
    }
    if (resource === "jobs" && id) {
      const job = await store.getJob(id);
      if (!job) throw qcError("Nie znaleziono zadania", 404);
      if (m === "GET")
        return send(res, {
          ...job,
          ...(await store.loadEvents(id, url.searchParams.get("after") ?? 0)),
        });
      if (m === "POST" && action === "cancel") {
        await worker.cancel(id);
        return send(res, { ok: true });
      }
      if (m === "POST" && action === "retry")
        return send(res, await worker.retry(id));
    }
    throw qcError("Nie ma takiej trasy QuickContent", 404);
  }
  return {
    route,
    store,
    worker,
    signature,
    project,
    startBatch,
    bridgeReelJob,
    reconcileReel,
    saveEditedReel,
    readEditedReel,
    originOf,
    close: () => worker.close(),
    recover: () => worker.recover(),
  };
}
function validateEditedData(before, after) {
  if (
    !after ||
    after.source !== before.source ||
    after.client !== before.client ||
    after.style !== before.style ||
    JSON.stringify(after.branding) !== JSON.stringify(before.branding) ||
    !Array.isArray(after.segments) ||
    !Array.isArray(after.captions)
  )
    throw qcError("Operator zmienił źródło, klienta lub format rolki");
  if ((after.fps ?? 30) !== (before.fps ?? 30) || !after.segments.length)
    throw qcError("Nieprawidłowy klatkaż lub pusta rolka");
  const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  const limit = Math.max(...before.segments.map((s) => s.end));
  if (
    after.segments.some(
      (s, i) =>
        !finite(s.start, 0, limit) ||
        !finite(s.end, s.start, limit) ||
        s.end <= s.start ||
        (i > 0 && s.start < after.segments[i - 1].end) ||
        (s.zoom !== undefined && !finite(s.zoom, 0.1, 10)) ||
        (s.zoomTo !== undefined && !finite(s.zoomTo, 0.1, 10)),
    )
  )
    throw qcError("Nieprawidłowe cięcia lub zoom");
  if (
    after.framing &&
    (!["fit", "crop"].includes(after.framing.mode) ||
      !finite(after.framing.centerX, 0, 1) ||
      !finite(after.framing.centerY, 0, 1) ||
      !validTracking(
        after.framing,
        Math.max(limit, ...(before.framing?.tracking ?? []).map((p) => p.time)),
      ))
  )
    throw qcError("Nieprawidłowy kadr");
  if (
    after.captions.some(
      (g) =>
        !Array.isArray(g.words) ||
        !g.words.length ||
        g.words.some(
          (w) =>
            typeof w.text !== "string" ||
            !finite(w.start, 0, limit) ||
            !finite(w.end, w.start, limit),
        ) ||
        (g.key !== undefined &&
          (!Number.isInteger(g.key) ||
            g.key < -1 ||
            g.key >= g.words.length)) ||
        (g.hl !== undefined &&
          (!Array.isArray(g.hl) ||
            g.hl.some(
              (i) => !Number.isInteger(i) || i < 0 || i >= g.words.length,
            ))),
    )
  )
    throw qcError("Nieprawidłowa grupa napisów");
  const original = before.captions.flatMap((g) => g.words),
    updated = after.captions.flatMap((g) => g.words);
  let cursor = 0;
  for (const word of updated) {
    const offset = original
      .slice(cursor)
      .findIndex((o) => o.start === word.start && o.end === word.end);
    if (offset < 0)
      throw qcError("Operator zmienił czasy, kolejność lub powielił słowa");
    cursor += offset + 1;
  }
  if (
    after.overlays !== undefined &&
    (!Array.isArray(after.overlays) ||
      after.overlays.some(
        (o) =>
          typeof o.type !== "string" ||
          !finite(o.start, 0, limit) ||
          !finite(o.end, o.start, limit) ||
          o.end <= o.start ||
          (o.src !== undefined &&
            (typeof o.src !== "string" ||
              path.isAbsolute(o.src) ||
              o.src.split(/[\\/]/).some((p) => p === "..") ||
              /^[a-z]+:/i.test(o.src))),
      ))
  )
    throw qcError("Nieprawidłowa grafika lub ścieżka assetu");
  if (
    (before.style === "skyclass" || before.client === "skyclass") &&
    (JSON.stringify(before.segments) !== JSON.stringify(after.segments) ||
      JSON.stringify(original.map((w) => [w.start, w.end])) !==
        JSON.stringify(updated.map((w) => [w.start, w.end])))
  )
    throw qcError("SkyClass musi zachować całą wypowiedź i wszystkie napisy");
}
