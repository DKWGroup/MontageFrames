import process from "node:process";
import { Buffer } from "node:buffer";
import { StringDecoder } from "node:string_decoder";
import {
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
} from "node:timers";
import { createReadStream } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { readFile, open, unlink, rename, stat } from "node:fs/promises";
import path from "node:path";
import {
  IdSchema,
  SCHEMA_VERSION,
  UsageSchema,
} from "../src/quickcontent/schema.mjs";
import { createStore, qcError } from "./quickcontent-store.mjs";
const execFileAsync = promisify(execFile);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const terminal = new Set([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
  "blocked",
]);
async function identity(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    const { stdout } = await execFileAsync("ps", [
      "-p",
      String(pid),
      "-o",
      "lstart=",
      "-o",
      "command=",
    ]);
    return stdout.trim() || null;
  } catch {
    try {
      process.kill(pid, 0);
    } catch (e) {
      if (e.code === "ESRCH") return null;
    }
    throw qcError("Nie można sprawdzić tożsamości procesu.", 503);
  }
}
async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
// Each tool has a group guardian: losing the parent's IPC shuts down descendants.
const guardian = `
const {spawn}=require('node:child_process');
let stopping=false;
function stop(){if(stopping)return;stopping=true;try{process.kill(-process.pid,'SIGTERM')}catch{};setTimeout(()=>{try{process.kill(-process.pid,'SIGKILL')}catch{};process.exit(1)},300);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);process.on('disconnect',stop);
process.on('message',m=>{if(m.stop){stop();return;}if(!m.run)return;
const child=spawn(m.executable,m.args,{cwd:m.cwd,env:m.env,shell:false,stdio:['ignore','pipe','pipe']});
child.stdout.on('data',d=>process.stdout.write(d));child.stderr.on('data',d=>process.stderr.write(d));
child.on('error',e=>{if(process.connected)process.send({error:e.message});stop()});
child.on('close',(code,signal)=>{if(process.connected)process.send({exitCode:code??1,signal},()=>stop());else stop()});
});
`;
export function createWorker({
  root,
  store = createStore(root),
  handlers = {},
  isBusy = () => false,
  acquire = null,
}) {
  root = path.resolve(root);
  const token = randomUUID();
  let ready = false,
    closed = false,
    recovery = null,
    active = null,
    timer = null,
    heartbeat = null,
    heartbeatTask = null,
    admin = Promise.resolve(),
    shutdown = null;
  const jobLocks = new Map();
  const lockFile = path.join(store.dataDir, "worker-lock.json");
  function serial(fn) {
    const next = admin.catch(() => {}).then(fn);
    admin = next;
    return next;
  }
  async function updateJob(id, fn) {
    const previous = jobLocks.get(id) || Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(async () => {
        const j = await store.getJob(id);
        const changed = fn(j);
        changed.updatedAt = new Date().toISOString();
        return store.saveJob(changed);
      });
    jobLocks.set(id, next);
    try {
      return await next;
    } finally {
      if (jobLocks.get(id) === next) jobLocks.delete(id);
    }
  }
  async function readLock() {
    try {
      return JSON.parse(
        await readFile(
          await store.safePath(lockFile, { mustExist: true }),
          "utf8",
        ),
      );
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }
  async function writeLock(value) {
    const temp = lockFile + "." + token + ".tmp";
    const file = await open(temp, "w", 0o600);
    try {
      await file.writeFile(JSON.stringify(value));
      await file.sync();
    } finally {
      await file.close();
    }
    const current = await readLock();
    if (current?.token !== token)
      throw qcError("Utracono blokadę kolejki.", 409);
    await rename(temp, lockFile);
  }
  async function acquireOwner() {
    await store.listJobs();
    await store.safePath(lockFile);
    const owner = {
      token,
      pid: process.pid,
      identity: await identity(process.pid),
      heartbeat: new Date().toISOString(),
    };
    if (!owner.identity)
      throw qcError("Nie można potwierdzić tożsamości procesu kolejki.", 503);
    for (let tries = 0; tries < 2; tries++) {
      try {
        const fd = await open(lockFile, "wx", 0o600);
        try {
          await fd.writeFile(JSON.stringify(owner));
          await fd.sync();
        } finally {
          await fd.close();
        }
        return owner;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
        const existing = await readLock();
        if (!existing || !Number.isInteger(existing.pid) || !existing.identity)
          throw qcError("Nie można potwierdzić właściciela blokady.", 409);
        if ((await identity(existing.pid)) === existing.identity)
          throw qcError("Inny worker QuickContent nadal pracuje.", 409);
        if ((await readLock())?.token !== existing.token)
          throw qcError("Właściciel kolejki zmienił się.", 409);
        await unlink(lockFile);
      }
    }
    throw qcError("Kolejka jest zajęta.", 409);
  }
  async function validateCheckpoints(checkpoints) {
    const valid = {};
    for (const [name, checkpoint] of Object.entries(checkpoints || {})) {
      try {
        if (!Array.isArray(checkpoint.artifacts)) continue;
        for (const artifact of checkpoint.artifacts) {
          const file = await store.safePath(artifact.path, { mustExist: true });
          if (
            !(await stat(file)).isFile() ||
            (await digest(file)) !== artifact.hash
          )
            throw new Error("changed");
        }
        valid[name] = checkpoint;
      } catch {
        /* An incomplete artifact cannot mark the stage complete. */
      }
    }
    return valid;
  }
  async function recover() {
    if (closed) throw qcError("Kolejka zatrzymana.", 503);
    if (ready) return;
    if (recovery) return recovery;
    recovery = (async () => {
      const owner = await acquireOwner();
      try {
        for (const job of await store.listJobs()) {
          if (job.status !== "running") continue;
          let unresolved = false;
          for (const child of job.processes || []) {
            const live = await identity(child.pid);
            if (live && live === child.identity) {
              for (
                let i = 0;
                i < 20 && (await identity(child.pid)) === child.identity;
                i++
              )
                await pause(25);
              if ((await identity(child.pid)) === child.identity)
                unresolved = true;
            }
          }
          await updateJob(job.id, (j) => ({
            ...j,
            status: unresolved ? "blocked" : "interrupted",
            error: unresolved
              ? "Poprzedni proces nadal pracuje; ponowienie jest zablokowane."
              : "Przerwano przez restart. Możesz ponowić.",
            processes: unresolved ? j.processes : [],
            checkpoint: j.checkpoint,
          }));
          await store.appendEvent(job.id, {
            status: unresolved ? "blocked" : "interrupted",
          });
        }
        ready = true;
        heartbeat = setInterval(() => {
          if (heartbeatTask) return;
          heartbeatTask = writeLock({
            ...owner,
            heartbeat: new Date().toISOString(),
          })
            .catch(() => {
              closed = true;
              active?.controller.abort();
            })
            .finally(() => {
              heartbeatTask = null;
            });
        }, 1000);
        heartbeat.unref();
        schedule();
      } catch (e) {
        if ((await readLock())?.token === token) await unlink(lockFile);
        throw e;
      }
    })();
    try {
      return await recovery;
    } finally {
      recovery = null;
    }
  }
  async function releaseOwner() {
    clearInterval(heartbeat);
    heartbeat = null;
    await heartbeatTask;
    if ((await readLock())?.token === token) await unlink(lockFile);
    ready = false;
  }
  function schedule() {
    if (closed || !ready || timer) return;
    timer = setTimeout(() => {
      timer = null;
      pump().catch(() => schedule());
    }, 30);
    timer.unref();
  }
  async function pump() {
    if (closed || active || !ready) return;
    let release;
    try {
      const current = await serial(async () => {
        if (closed || active || (await isBusy())) return null;
        const job = (await store.listJobs()).find((j) => j.status === "queued");
        if (!job) {
          await releaseOwner();
          return null;
        }
        if (acquire) {
          release = await acquire(job);
          if (!release) return null;
        }
        const controller = new globalThis.AbortController();
        const current = {
          id: job.id,
          controller,
          children: new Set(),
          done: null,
        };
        active = current;
        current.done = execute(job, current).finally(async () => {
          try {
            if (release) await release();
          } finally {
            if (active === current) active = null;
          }
        });
        return current;
      });
      if (current) await current.done;
    } finally {
      schedule();
    }
  }
  async function execute(job, current) {
    await updateJob(job.id, (j) => ({
      ...j,
      status: "running",
      stageStartedAt: new Date().toISOString(),
      heartbeat: new Date().toISOString(),
      ownerToken: token,
      error: undefined,
      processes: [],
    }));
    await store.appendEvent(job.id, { status: "running", stage: job.stage });
    let beat;
    try {
      const checkpoints = await validateCheckpoints(job.checkpoint);
      await updateJob(job.id, (j) => ({ ...j, checkpoint: checkpoints }));
      beat = setInterval(
        () =>
          updateJob(job.id, (j) => ({
            ...j,
            heartbeat: new Date().toISOString(),
          })).catch(() => current.controller.abort()),
        1000,
      );
      beat.unref();
      const ctx = {
        root,
        store,
        jobId: job.id,
        signal: current.controller.signal,
        checkpoints,
        recordUsage: async (receipt) => {
          const valid = UsageSchema.parse(receipt);
          await updateJob(job.id, (j) => ({
            ...j,
            usage: [...(j.usage ?? []), valid],
          }));
        },
        report: async (update) => {
          if (current.controller.signal.aborted)
            throw new globalThis.DOMException("Anulowano", "AbortError");
          const allowed = [
            "stage",
            "progress",
            "completedUnits",
            "totalUnits",
            "progressUnit",
            "progressDetail",
            "runtimeLabel",
            "etaSeconds",
          ];
          if (Object.keys(update).some((k) => !allowed.includes(k)))
            throw qcError("Nieprawidłowy raport postępu.");
          const j = await updateJob(job.id, (j) => {
            const changed =
              update.stage !== undefined && update.stage !== j.stage;
            const measured =
              update.progress !== null &&
              update.progress !== undefined &&
              (update.progress !== j.progress ||
                (update.completedUnits !== undefined &&
                  update.completedUnits !== j.completedUnits));
            return {
              ...j,
              ...(changed
                ? {
                    stageStartedAt: new Date().toISOString(),
                    progress: null,
                    completedUnits: 0,
                    totalUnits: 0,
                    progressUnit: undefined,
                    progressDetail: undefined,
                    runtimeLabel: undefined,
                    etaSeconds: undefined,
                    progressUpdatedAt: undefined,
                  }
                : {}),
              ...update,
              ...(measured
                ? { progressUpdatedAt: new Date().toISOString() }
                : {}),
            };
          });
          await store.appendEvent(job.id, { ...update, status: j.status });
        },
        checkpoint: async (name, artifacts) => {
          IdSchema.parse(name);
          if (current.controller.signal.aborted)
            throw new globalThis.DOMException("Anulowano", "AbortError");
          if (!Array.isArray(artifacts)) artifacts = Object.values(artifacts);
          const references = [];
          for (const item of artifacts) {
            const file = await store.safePath(
              typeof item === "string" ? item : item.path,
              { mustExist: true },
            );
            if (!(await stat(file)).isFile())
              throw qcError("Checkpoint wymaga pliku.");
            references.push({ path: file, hash: await digest(file) });
          }
          const completed = {
            artifacts: references,
            completedAt: new Date().toISOString(),
          };
          await updateJob(job.id, (j) => ({
            ...j,
            checkpoint: { ...j.checkpoint, [name]: completed },
          }));
          checkpoints[name] = completed;
          await store.appendEvent(job.id, { stage: name, checkpoint: name });
        },
        runTool: (executable, args, options = {}) =>
          runTool(job.id, current, executable, args, options),
      };
      const handler = handlers[job.kind];
      if (!handler) throw qcError("Brak wykonawcy etapu " + job.kind + ".");
      const artifacts = await handler(job.payload, ctx);
      if (current.controller.signal.aborted)
        throw new globalThis.DOMException("Anulowano", "AbortError");
      await updateJob(job.id, (j) => ({
        ...j,
        status: "completed",
        progress: 1,
        artifactReferences: artifacts || {},
        processes: [],
      }));
      await store.appendEvent(job.id, { status: "completed", progress: 1 });
    } catch (e) {
      const status = current.controller.signal.aborted ? "cancelled" : "failed";
      await updateJob(job.id, (j) => ({
        ...j,
        status,
        error:
          status === "cancelled"
            ? "Anulowano zadanie."
            : String(e.message || e),
        processes: [],
      }));
      await store.appendEvent(job.id, {
        status,
        error:
          status === "cancelled"
            ? "Anulowano zadanie."
            : String(e.message || e),
      });
    } finally {
      clearInterval(beat);
      for (const child of current.children)
        if (child.connected) child.send({ stop: true });
    }
  }
  async function runTool(jobId, current, executable, args, options) {
    if (current.controller.signal.aborted)
      throw new globalThis.DOMException("Anulowano", "AbortError");
    if (
      typeof executable !== "string" ||
      !Array.isArray(args) ||
      args.some((a) => typeof a !== "string") ||
      options.shell
    )
      throw qcError("Narzędzie wymaga tablicy argumentów i shell:false.");
    const cwd = await store.safePath(options.cwd || root, { mustExist: true });
    const processToken = randomUUID();
    const child = spawn(
      process.execPath,
      ["-e", guardian, "--", processToken],
      {
        cwd,
        detached: true,
        stdio: ["ignore", "pipe", "pipe", "ipc"],
        env: process.env,
      },
    );
    current.children.add(child);
    let stdout = "",
      stderr = "",
      result = null,
      spawnError = null;
    const limit = options.maxOutputBytes || options.maxBuffer || 1024 * 1024;
    let outputExceeded = false;
    const received = { stdout: 0, stderr: 0 };
    const decoders = {
      stdout: new StringDecoder("utf8"),
      stderr: new StringDecoder("utf8"),
    };
    const pending = { stdout: "", stderr: "" };
    function output(kind, data) {
      const value = decoders[kind].write(data);
      received[kind] += data.length;
      if (received[kind] > limit) outputExceeded = true;
      if (kind === "stdout") {
        stdout = Buffer.from(stdout + value)
          .subarray(-limit)
          .toString();
        options.onStdout?.(value);
      } else {
        stderr = Buffer.from(stderr + value)
          .subarray(-limit)
          .toString();
        options.onStderr?.(value);
      }
      pending[kind] += value;
      const lines = pending[kind].split(/\r?\n|\r/);
      pending[kind] = Buffer.from(lines.pop()).subarray(-limit).toString();
      for (const line of lines) options.onLine?.(line, kind);
    }
    child.stdout.on("data", (data) => output("stdout", data));
    child.stderr.on("data", (data) => output("stderr", data));
    child.on("message", (message) => {
      result = message;
    });
    child.on("error", (e) => {
      spawnError = e;
    });
    const completion = new Promise((resolve) => child.on("close", resolve));
    const abort = () => {
      if (child.connected) child.send({ stop: true });
    };
    current.controller.signal.addEventListener("abort", abort, { once: true });
    try {
      const processIdentity = await identity(child.pid);
      if (!processIdentity)
        throw qcError("Nie udało się potwierdzić procesu narzędzia.");
      await updateJob(jobId, (j) => ({
        ...j,
        processes: [
          ...(j.processes || []),
          {
            pid: child.pid,
            identity: processIdentity,
            token: processToken,
            ownerToken: token,
          },
        ],
      }));
      if (current.controller.signal.aborted) abort();
      else if (child.connected)
        child.send({
          run: true,
          executable,
          args,
          cwd,
          env: { ...process.env, ...options.env },
        });
      await completion;
      if (current.controller.signal.aborted)
        throw new globalThis.DOMException("Anulowano", "AbortError");
      if (spawnError) throw spawnError;
      if (result?.error) throw new Error(result.error);
      if (!result)
        throw new Error("Proces narzędzia zakończył się bez wyniku.");
      if (result.exitCode !== 0)
        throw Object.assign(
          new Error(
            path.basename(executable) +
              " zakończył się kodem " +
              result.exitCode +
              ": " +
              stderr.slice(-4000),
          ),
          { exitCode: result.exitCode },
        );
      for (const kind of ["stdout", "stderr"])
        if (pending[kind]) options.onLine?.(pending[kind], kind);
      return {
        exitCode: result.exitCode,
        stdout,
        stderr,
        signal: result.signal,
        outputTruncated: outputExceeded,
      };
    } finally {
      current.controller.signal.removeEventListener("abort", abort);
      if (child.connected) child.send({ stop: true });
      await completion;
      current.children.delete(child);
      await updateJob(jobId, (j) => ({
        ...j,
        processes: (j.processes || []).filter((p) => p.pid !== child.pid),
      }));
    }
  }
  async function enqueue(kind, payload, { idempotencyKey } = {}) {
    return serial(async () => {
      await recover();
      if (closed) throw qcError("Kolejka zatrzymana.", 503);
      IdSchema.parse(kind);
      IdSchema.parse(payload?.projectId);
      if (payload.candidateId) IdSchema.parse(payload.candidateId);
      if (!handlers[kind]) throw qcError("Nieznany typ zadania.");
      if (
        idempotencyKey !== undefined &&
        (typeof idempotencyKey !== "string" ||
          !idempotencyKey ||
          idempotencyKey.length > 256)
      )
        throw qcError("Niepoprawny klucz operacji.");
      const existing = (await store.listJobs()).find(
        (j) =>
          idempotencyKey &&
          j.idempotencyKey === idempotencyKey &&
          j.projectId === payload.projectId,
      );
      if (existing) {
        if (
          existing.kind !== kind ||
          JSON.stringify(existing.payload) !== JSON.stringify(payload)
        )
          throw qcError("Klucz operacji użyty z innymi danymi.", 409);
        return existing;
      }
      const now = new Date().toISOString();
      const job = {
        schemaVersion: SCHEMA_VERSION,
        id: "job-" + randomUUID(),
        projectId: payload.projectId,
        ...(payload.candidateId ? { candidateId: payload.candidateId } : {}),
        ...(payload.batchId ? { batchId: payload.batchId } : {}),
        kind,
        status: "queued",
        stage: "queued",
        progress: null,
        completedUnits: 0,
        totalUnits: 0,
        checkpoint: {},
        attempt: 1,
        heartbeat: null,
        payload,
        idempotencyKey,
        processes: [],
        createdAt: now,
        updatedAt: now,
      };
      await store.saveJob(job);
      await store.appendEvent(job.id, { status: "queued" });
      schedule();
      return job;
    });
  }
  async function cancel(id) {
    return serial(async () => {
      await recover();
      const job = await store.getJob(id);
      if (!job) throw qcError("Nie znaleziono zadania.", 404);
      if (terminal.has(job.status)) return job;
      if (active?.id === id) {
        const current = active;
        current.controller.abort();
        await current.done;
        return store.getJob(id);
      }
      const result = await updateJob(id, (j) => ({
        ...j,
        status: "cancelled",
        error: "Anulowano zadanie.",
      }));
      await store.appendEvent(id, { status: "cancelled" });
      return result;
    });
  }
  async function retry(id) {
    if (active?.id === id) await active.done;
    return serial(async () => {
      await recover();
      const j = await store.getJob(id);
      if (!j) throw qcError("Nie znaleziono zadania.", 404);
      if (
        !["failed", "cancelled", "interrupted"].includes(j.status) ||
        active?.id === id
      )
        throw qcError("Zadanie nie może być ponowione.", 409);
      for (const child of j.processes || [])
        if ((await identity(child.pid)) === child.identity)
          throw qcError("Proces poprzedniej próby nadal pracuje.", 409);
      const job = await updateJob(id, (j) => ({
        ...j,
        status: "queued",
        attempt: j.attempt + 1,
        progress: null,
        error: undefined,
        processes: [],
      }));
      await store.appendEvent(id, { status: "queued", attempt: job.attempt });
      schedule();
      return job;
    });
  }
  function close() {
    if (shutdown) return shutdown;
    shutdown = (async () => {
      closed = true;
      clearTimeout(timer);
      timer = null;
      await recovery?.catch(() => {});
      await admin.catch(() => {});
      if (active) {
        const current = active;
        current.controller.abort();
        await current.done;
      }
      await releaseOwner();
    })();
    return shutdown;
  }
  return { enqueue, cancel, retry, recover, close };
}
