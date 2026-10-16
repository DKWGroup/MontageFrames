import process from "node:process";
import { URL } from "node:url";
import { setTimeout } from "node:timers";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStore } from "./quickcontent-store.mjs";
import { createWorker } from "./quickcontent-worker.mjs";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn) {
  for (let i = 0; i < 250; i++) {
    const v = await fn();
    if (v) return v;
    await pause(20);
  }
  throw new Error("timeout");
}
async function fixture(handlers) {
  const root = await mkdtemp(path.join(tmpdir(), "qc-worker-"));
  const store = createStore(root);
  const worker = createWorker({ root, store, handlers });
  await worker.recover();
  return { root, store, worker };
}
test("persistent queue runs one job at a time and duplicate key returns same job", async (t) => {
  let running = 0,
    max = 0;
  const { store, worker } = await fixture({
    work: async () => {
      running++;
      max = Math.max(max, running);
      await pause(60);
      running--;
      return { ok: true };
    },
  });
  t.after(() => worker.close());
  const [a, b] = await Promise.all([
    worker.enqueue(
      "work",
      { projectId: "project-one" },
      { idempotencyKey: "same" },
    ),
    worker.enqueue(
      "work",
      { projectId: "project-one" },
      { idempotencyKey: "same" },
    ),
  ]);
  assert.equal(a.id, b.id);
  const c = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => (await store.getJob(c.id)).status === "completed");
  assert.equal(max, 1);
  assert.equal((await store.listJobs()).length, 2);
});
test("retry validates and reuses artifact checkpoints without repeating complete stage", async (t) => {
  let calls = 0;
  let attempts = 0;
  const { root, store, worker } = await fixture({
    work: async (_, ctx) => {
      if (!ctx.checkpoints.download) {
        calls++;
        const file = path.join(ctx.root, "artifact");
        await writeFile(file, "data");
        await ctx.checkpoint("download", [file]);
      }
      if (attempts++ === 0) throw new Error("expected failure");
      return {};
    },
  });
  t.after(() => worker.close());
  const j = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => (await store.getJob(j.id)).status === "failed");
  await worker.retry(j.id);
  await until(async () => (await store.getJob(j.id)).status === "completed");
  assert.equal(calls, 1);
  assert.equal((await store.getJob(j.id)).attempt, 2);
  assert.equal(await readFile(path.join(root, "artifact"), "utf8"), "data");
});
test("cancel stops own tool descendants and leaves unrelated process intact", async (t) => {
  const { root, store, worker } = await fixture({
    work: async (_, ctx) => {
      const code = `const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(path.join(ctx.root, "pids"))},JSON.stringify([process.pid,child.pid]));setInterval(()=>{},1000);`;
      return ctx.runTool(process.execPath, ["-e", code]);
    },
  });
  t.after(() => worker.close());
  const job = await worker.enqueue("work", { projectId: "project-one" });
  const pids = await until(async () => {
    try {
      return JSON.parse(await readFile(path.join(root, "pids"), "utf8"));
    } catch {
      return false;
    }
  });
  await worker.cancel(job.id);
  assert.equal((await store.getJob(job.id)).status, "cancelled");
  for (const pid of pids)
    await until(() => {
      try {
        process.kill(pid, 0);
        return false;
      } catch (e) {
        return e.code === "ESRCH";
      }
    });
  assert.doesNotThrow(() => process.kill(process.pid, 0));
});
test("live lock cannot be taken over; stale running job becomes interrupted without killing unrelated PID", async (t) => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const { root, store, worker } = await fixture({
    work: async () => {
      await pending;
      return {};
    },
  });
  t.after(() => finish());
  const activeJob = await worker.enqueue("work", { projectId: "project-one" });
  await until(
    async () => (await store.getJob(activeJob.id)).status === "running",
  );
  t.after(() => worker.close());
  const second = createWorker({ root, store, handlers: {} });
  await assert.rejects(second.recover(), (e) => e.statusCode === 409);
  finish();
  await until(
    async () => (await store.getJob(activeJob.id)).status === "completed",
  );
  await worker.close();
  const now = new Date().toISOString();
  await store.saveJob({
    schemaVersion: 1,
    id: "job-old",
    projectId: "project-one",
    kind: "work",
    status: "running",
    stage: "render",
    progress: null,
    completedUnits: 0,
    totalUnits: 0,
    checkpoint: {},
    attempt: 1,
    heartbeat: now,
    payload: { projectId: "project-one" },
    createdAt: now,
    updatedAt: now,
    processes: [{ pid: process.pid, identity: "not-this-process" }],
  });
  await second.recover();
  t.after(() => second.close());
  assert.equal((await store.getJob("job-old")).status, "interrupted");
  assert.doesNotThrow(() => process.kill(process.pid, 0));
});
test("runTool rejects shell option, reports bounded output and surfaces nonzero exit", async (t) => {
  const { store, worker } = await fixture({
    work: async (_, ctx) => {
      await assert.rejects(ctx.runTool("echo", [], { shell: true }));
      await assert.rejects(
        ctx.runTool(process.execPath, [
          "-e",
          'console.error("expected-error");process.exit(3)',
        ]),
        /expected-error/,
      );
      const result = await ctx.runTool(process.execPath, [
        "-e",
        'console.log("hello")',
      ]);
      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /hello/);
      return {};
    },
  });
  t.after(() => worker.close());
  const job = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => (await store.getJob(job.id)).status === "completed");
});

test("shared resource acquisition holds job queued and releases after failure", async (t) => {
  let busy = true,
    released = 0;
  const root = await mkdtemp(path.join(tmpdir(), "qc-resource-"));
  const store = createStore(root);
  const worker = createWorker({
    root,
    store,
    handlers: {
      work: async () => {
        throw new Error("failure");
      },
    },
    acquire: async () =>
      busy
        ? null
        : () => {
            released++;
          },
  });
  t.after(() => worker.close());
  const j = await worker.enqueue("work", { projectId: "project-one" });
  await pause(120);
  assert.equal((await store.getJob(j.id)).status, "queued");
  busy = false;
  await until(async () => (await store.getJob(j.id)).status === "failed");
  await until(() => released === 1);
});

for (const [stage, signal] of [
  ["video", "SIGKILL"],
  ["transcribe", "SIGTERM"],
  ["render", "SIGKILL"],
])
  test(
    "parent " +
      signal +
      " during " +
      stage +
      " stops tool and recovery does not double execution",
    async (t) => {
      const root = await mkdtemp(path.join(tmpdir(), "qc-crash-"));
      const store = createStore(root);
      const moduleUrl = new URL("./quickcontent-worker.mjs", import.meta.url)
        .href;
      const childCode = `import {createWorker} from ${JSON.stringify(moduleUrl)};const root=${JSON.stringify(root)};const worker=createWorker({root,handlers:{work:async(_,ctx)=>{await ctx.report({stage:${JSON.stringify(stage)}});await ctx.runTool(process.execPath,['-e',${JSON.stringify("require('node:fs').writeFileSync(" + JSON.stringify(path.join(root, "tool-pid")) + ",String(process.pid));setInterval(()=>{},1000)")}]);}}});const job=await worker.enqueue('work',{projectId:'project-one'});process.send({jobId:job.id});setInterval(()=>{},1000);`;
      const child = spawn(
        process.execPath,
        ["--input-type=module", "-e", childCode],
        { stdio: ["ignore", "pipe", "pipe", "ipc"] },
      );
      t.after(() => {
        if (child.exitCode === null && child.signalCode === null)
          child.kill("SIGKILL");
      });
      const [{ jobId }] = await once(child, "message");
      const toolPid = await until(async () => {
        try {
          return Number(await readFile(path.join(root, "tool-pid"), "utf8"));
        } catch {
          return false;
        }
      });
      const before = await store.getJob(jobId);
      assert.equal(before.status, "running");
      assert.equal(before.stage, stage);
      const exited = once(child, "exit");
      child.kill(signal);
      await exited;
      await until(() => {
        try {
          process.kill(toolPid, 0);
          return false;
        } catch (e) {
          return e.code === "ESRCH";
        }
      });
      let resumed = 0;
      const replacement = createWorker({
        root,
        store,
        handlers: {
          work: async () => {
            resumed++;
            return {};
          },
        },
      });
      t.after(() => replacement.close());
      await replacement.recover();
      assert.equal((await store.getJob(jobId)).status, "interrupted");
      await replacement.retry(jobId);
      await until(
        async () => (await store.getJob(jobId)).status === "completed",
      );
      assert.equal(resumed, 1);
    },
  );

test("retry repeats a stage whose completed artifact was changed", async (t) => {
  let calls = 0,
    attempts = 0;
  const { root, store, worker } = await fixture({
    work: async (_, ctx) => {
      if (!ctx.checkpoints.video) {
        calls++;
        const file = path.join(ctx.root, "source");
        await writeFile(file, "original");
        await ctx.checkpoint("video", [file]);
      }
      if (attempts++ === 0) throw new Error("restart stage");
      return {};
    },
  });
  t.after(() => worker.close());
  const job = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => (await store.getJob(job.id)).status === "failed");
  await writeFile(path.join(root, "source"), "changed");
  await worker.retry(job.id);
  await until(async () => (await store.getJob(job.id)).status === "completed");
  assert.equal(calls, 2);
});
test("cancelled queued jobs never run when resource becomes available", async (t) => {
  let busy = true,
    calls = 0;
  const root = await mkdtemp(path.join(tmpdir(), "qc-queued-"));
  const store = createStore(root);
  const worker = createWorker({
    root,
    store,
    isBusy: () => busy,
    handlers: {
      work: async () => {
        calls++;
        return {};
      },
    },
  });
  t.after(() => worker.close());
  const jobs = await Promise.all(
    Array.from({ length: 12 }, () =>
      worker.enqueue("work", { projectId: "project-one" }),
    ),
  );
  await Promise.all(jobs.map((job) => worker.cancel(job.id)));
  busy = false;
  await pause(180);
  assert.equal(calls, 0);
  assert.ok((await store.listJobs()).every((j) => j.status === "cancelled"));
});
test("tool output stays bounded and marks truncation", async (t) => {
  const { store, worker } = await fixture({
    work: async (_, ctx) => {
      const result = await ctx.runTool(
        process.execPath,
        ["-e", 'process.stdout.write("a".repeat(10000))'],
        { maxOutputBytes: 1024 },
      );
      assert.ok(result.stdout.length <= 1024);
      assert.equal(result.outputTruncated, true);
      return {};
    },
  });
  t.after(() => worker.close());
  const job = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => terminalState(await store.getJob(job.id)));
  assert.equal((await store.getJob(job.id)).status, "completed");
});
function terminalState(job) {
  return ["completed", "failed", "cancelled"].includes(job.status);
}
test("job reports persist transcription detail, stage timing and last measured progress", async (t) => {
  const { store, worker } = await fixture({
    work: async (_, ctx) => {
      await ctx.report({
        stage: "transcribe",
        progress: null,
        progressDetail: "Ładowanie",
        runtimeLabel: "Whisper CPU",
        progressUnit: "audioFrames",
        completedUnits: 0,
        totalUnits: 300,
        etaSeconds: null,
      });
      const started = (await store.getJob(ctx.jobId)).stageStartedAt;
      assert.ok(started);
      await ctx.report({
        stage: "transcribe",
        progress: 0.5,
        progressDetail: "Rozpoznawanie",
        completedUnits: 150,
        etaSeconds: 2,
      });
      const saved = await store.getJob(ctx.jobId);
      assert.equal(saved.stageStartedAt, started);
      assert.ok(saved.progressUpdatedAt);
      assert.equal(saved.etaSeconds, 2);
      await ctx.report({ stage: "analyze", progress: null });
      const next = await store.getJob(ctx.jobId);
      assert.equal(next.progressUnit, undefined);
      assert.equal(next.progressDetail, undefined);
      assert.equal(next.etaSeconds, undefined);
      return {};
    },
  });
  t.after(() => worker.close());
  const job = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => terminalState(await store.getJob(job.id)));
  assert.equal((await store.getJob(job.id)).status, "completed");
});

test("close during heartbeat releases lock before a new owner resumes", async (t) => {
  const { root, store, worker } = await fixture({ work: async () => ({}) });
  await pause(1020);
  await worker.close();
  const replacement = createWorker({
    root,
    store,
    handlers: { work: async () => ({}) },
  });
  t.after(() => replacement.close());
  await replacement.recover();
  await pause(100);
  const job = await replacement.enqueue("work", { projectId: "project-one" });
  await until(async () => (await store.getJob(job.id)).status === "completed");
});

test("idle startup releases owner lock so another panel can enqueue, active owner stays exclusive", async (t) => {
  const { root, store, worker } = await fixture({ work: async () => ({}) });
  t.after(() => worker.close());
  const lockFile = path.join(root, ".quickcontent/worker-lock.json");
  await until(async () => {
    try {
      await readFile(lockFile);
      return false;
    } catch (e) {
      return e.code === "ENOENT";
    }
  });
  let finish;
  const blocked = new Promise((resolve) => {
    finish = resolve;
  });
  const second = createWorker({
    root,
    store,
    handlers: {
      work: async () => {
        await blocked;
        return {};
      },
    },
  });
  t.after(() => second.close());
  const job = await second.enqueue(
    "work",
    { projectId: "project-one" },
    { idempotencyKey: "shared-key" },
  );
  await until(async () => (await store.getJob(job.id)).status === "running");
  await assert.rejects(
    worker.enqueue("work", { projectId: "project-one" }),
    (e) => e.statusCode === 409,
  );
  finish();
  await until(async () => (await store.getJob(job.id)).status === "completed");
  await until(async () => {
    try {
      await readFile(lockFile);
      return false;
    } catch (e) {
      return e.code === "ENOENT";
    }
  });
  const duplicate = await worker.enqueue(
    "work",
    { projectId: "project-one" },
    { idempotencyKey: "shared-key" },
  );
  assert.equal(duplicate.id, job.id);
  const next = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => (await store.getJob(next.id)).status === "completed");
});

test("runTool decodes UTF8 split across stdout and stderr chunks", async (t) => {
  const { store, worker } = await fixture({
    work: async (_, ctx) => {
      const code =
        'const b=Buffer.from("ą");process.stdout.write(b.subarray(0,1));process.stderr.write(b.subarray(0,1));setTimeout(()=>{process.stdout.write(b.subarray(1));process.stderr.write(b.subarray(1));},40)';
      const result = await ctx.runTool(process.execPath, ["-e", code]);
      assert.equal(result.stdout, "ą");
      assert.equal(result.stderr, "ą");
      return {};
    },
  });
  t.after(() => worker.close());
  const job = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => terminalState(await store.getJob(job.id)));
  assert.equal((await store.getJob(job.id)).status, "completed");
});

test("AI usage is durable before a later failure and retained across retry", async (t) => {
  let attempt = 0;
  const { store, worker } = await fixture({
    work: async (_, ctx) => {
      await ctx.recordUsage({
        provider: "openai",
        model: "gpt-6-luna",
        responseId: "r" + ++attempt,
        inputTokens: 10,
        outputTokens: 10,
        cachedTokens: 0,
        cacheWriteTokens: 0,
        costMicroUsd: 6,
        pricingDate: "2026-10-15",
        priceSource: "https://developers.openai.com/api/docs/pricing",
        at: new Date().toISOString(),
      });
      if (attempt === 1) throw Error("JSON invalid after paid response");
    },
  });
  t.after(() => worker.close());
  const j = await worker.enqueue("work", { projectId: "project-one" });
  await until(async () => terminalState(await store.getJob(j.id)));
  assert.equal((await store.getJob(j.id)).usage.length, 1);
  await worker.retry(j.id);
  await until(async () => (await store.getJob(j.id)).status === "completed");
  assert.equal((await store.getJob(j.id)).usage.length, 2);
});
