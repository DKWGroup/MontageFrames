import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createReelStore } from "../ui/reel-store.mjs";
import { isName } from "../ui/lib.mjs";
import { safePath, writeMediaJson, hashFile } from "./quickcontent-ingest.mjs";
import { validateReelEdit } from "./reel-validation.mjs";
import { montageRequest, applyEditResult } from "./quickcontent-edit.mjs";
import { planRecompute } from "./quality/dependencies.mjs";
import { requestQuickContentAI } from "./quickcontent-ai.mjs";
import { preflightReelAssets } from "./quality/render-assets.mjs";
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
export async function editOrdinaryReel(
  { root, reelName, message, scope },
  ctx = {},
  { store = createReelStore(root), requestAI = requestQuickContentAI } = {},
) {
  if (
    !isName(reelName) ||
    !["captions", "operations"].includes(scope) ||
    !String(message ?? "").trim()
  )
    throw fail("Nieprawidłowa poprawka lub zakres");
  const provider = ctx.aiProvider ?? "claude";
  if (
    !["claude", "codex"].includes(provider) ||
    ctx.settings?.operator === "claude-api-key"
  )
    throw fail(
      "Mały zakres zwykłej rolki korzysta z konta CLI. Wybierz konto albo dotychczasowy pełny montaż API.",
    );
  // Refuse QC before charging: its worker owns revision numbering and active-job guards.
  const context = await store.operations(reelName),
    state = await store.read(reelName);
  if (context.baseRevision !== state.editRevision)
    throw fail("Rolka zmieniła rewizję; ponów poprawkę", 409);
  const data = state.data;
  validateReelEdit(data, data);
  const sourceSha256 = await hashFile(
    await safePath(root, `public/reels/${reelName}/${data.source}`),
  );
  if (data.client && !isName(data.client))
    throw fail("Nieprawidłowy klient rolki");
  const read = async (relative) =>
    fs.readFile(await safePath(root, relative), "utf8");
  const template = {
    styleId: data.style,
    clientId: data.client ?? null,
    preferences: {
      general: await read("PREFERENCJE.md"),
      client: data.client
        ? await read(`klienci/${data.client}/PREFERENCJE.md`)
        : null,
    },
  };
  if (data.branding?.qualityContract)
    await preflightReelAssets(root, reelName, data);
  const sourceIdentity = `ordinary:${reelName}:${sourceSha256}`;
  const request = montageRequest(data, template, message, {
    scope,
    revision: state.editRevision,
    sourceIdentity,
  });
  const attemptPath = await safePath(
    root,
    `.quickcontent/reel-edits/${randomUUID()}.json`,
    { create: true },
  );
  const attempt = {
    version: 1,
    reelName,
    scope,
    baseRevision: state.editRevision,
    sourceSha256,
    status: "running",
    usage: [],
    startedAt: new Date().toISOString(),
  };
  await writeMediaJson(attemptPath, attempt);
  try {
    ctx.signal?.throwIfAborted();
    const response = await requestAI(request, {
      ...ctx,
      root,
      aiProvider: provider,
      attemptPath,
      runTool:
        ctx.runTool ??
        ((exe, args, options = {}) =>
          promisify(execFile)(exe, args, {
            cwd: options.cwd ?? root,
            env: { ...process.env, ...options.env },
            signal: ctx.signal,
            timeout: 180000,
            maxBuffer: options.maxOutputBytes ?? 16 * 1024 * 1024,
          })),
      recordUsage: async (usage) => {
        attempt.usage.push(usage);
        await writeMediaJson(attemptPath, attempt);
        await ctx.recordUsage?.(usage);
      },
    });
    ctx.signal?.throwIfAborted();
    if (response?.version !== (scope === "captions" ? 2 : 3))
      throw fail(
        "Operator zwrócił inny zakres odpowiedzi. Rolka pozostała bez zmian.",
      );
    const result = applyEditResult(data, response, {
      currentRevision: state.editRevision,
      sourceIdentity,
      scope,
    });
    const saved = await store.save(reelName, result.data, state.editRevision, {
      sourceSha256,
    });
    Object.assign(attempt, {
      status: "completed",
      summary: result.summary,
      editRevision: saved.editRevision,
      completedAt: new Date().toISOString(),
    });
    await writeMediaJson(attemptPath, attempt);
    return {
      ...saved,
      summary: result.summary,
      invalidatedStages:
        result.invalidatedStages ?? planRecompute(data, result.data),
      attemptPath,
    };
  } catch (error) {
    attempt.status = ctx.signal?.aborted ? "cancelled" : "failed";
    attempt.completedAt = new Date().toISOString();
    await writeMediaJson(attemptPath, attempt);
    throw error;
  }
}
