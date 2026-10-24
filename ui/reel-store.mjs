import { editOperationContext } from "../scripts/quality/edit-operations.mjs";
import { applyEditResult } from "../scripts/quickcontent-edit.mjs";
import fs from "node:fs/promises";
import { validateReelEdit } from "../scripts/reel-validation.mjs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import {
  safePath,
  writeMediaJson,
  hashFile,
} from "../scripts/quickcontent-ingest.mjs";
import { isName } from "./lib.mjs";
const fail = (status, message) => Object.assign(new Error(message), { status });
// Content revision also detects edits made directly by the terminal operator.
const revision = (data) =>
  parseInt(
    createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
      .slice(0, 13),
    16,
  );
export function createReelStore(root) {
  const pending = new Map(),
    lastSnapshot = new Map();
  const file = async (name) => {
    if (!isName(name)) throw fail(400, "Zła nazwa rolki");
    return safePath(root, `public/reels/${name}/reel.json`);
  };
  const withFileLock = async (name, operation) => {
    const lock = (await file(name)) + ".edit.lock";
    let handle;
    try {
      handle = await fs.open(lock, "wx");
    } catch (error) {
      if (error.code === "EEXIST")
        throw fail(
          409,
          "Rolka jest zapisywana przez inny proces. Ponów po zakończeniu pracy.",
        );
      throw error;
    }
    try {
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
      );
      return await operation();
    } finally {
      await handle.close();
      await fs.unlink(lock);
    }
  };
  const read = async (name) => {
    const data = JSON.parse(await fs.readFile(await file(name), "utf8"));
    return { data, editRevision: revision(data) };
  };
  const save = (name, data, expectedRevision, { sourceSha256 } = {}) => {
    const task = (pending.get(name) ?? Promise.resolve())
      .catch(() => {})
      .then(() =>
        withFileLock(name, async () => {
          const before = await read(name);
          if (
            !Number.isSafeInteger(expectedRevision) ||
            before.editRevision !== expectedRevision
          )
            throw fail(
              409,
              "Rolka zmieniła się — wczytaj aktualną wersję przed zapisem. Szkic pozostaje w edytorze.",
            );
          if (
            !data ||
            data.source !== before.data.source ||
            data.client !== before.data.client ||
            JSON.stringify(data.branding) !==
              JSON.stringify(before.data.branding) ||
            (before.data.branding && data.style !== before.data.style) ||
            !Array.isArray(data.segments) ||
            !data.segments.length ||
            !Array.isArray(data.captions) ||
            data.segments.some(
              (s) =>
                !Number.isFinite(s.start) ||
                !Number.isFinite(s.end) ||
                s.start < 0 ||
                s.end <= s.start,
            )
          )
            throw fail(
              400,
              "Nieprawidłowy montaż lub zmieniona tożsamość źródła.",
            );
          validateReelEdit(before.data, data, {
            lockStyle: Boolean(before.data.branding),
          });
          if (sourceSha256 !== undefined) {
            const source = await safePath(
              root,
              `public/reels/${name}/${before.data.source}`,
            );
            if ((await hashFile(source)) !== sourceSha256)
              throw fail(
                409,
                "Nagranie źródłowe zmieniło się podczas poprawki. Zachowano szkic.",
              );
          }
          const target = await file(name),
            history = path.join(path.dirname(target), "historia");
          await fs.mkdir(history, { recursive: true });
          if (Date.now() - (lastSnapshot.get(name) ?? 0) > 5 * 60_000) {
            await writeMediaJson(
              path.join(history, `${Date.now()}-${randomUUID()}.json`),
              before.data,
            );
            lastSnapshot.set(name, Date.now());
          }
          await writeMediaJson(target, data);
          return { ok: true, editRevision: revision(data) };
        }),
      );
    pending.set(name, task);
    return task.finally(() => {
      if (pending.get(name) === task) pending.delete(name);
    });
  };
  const guard = (name, operation) => {
    const task = (pending.get(name) ?? Promise.resolve())
      .catch(() => {})
      .then(() =>
        withFileLock(name, async () => {
          const before = await read(name);
          try {
            const result = await operation();
            const after = await read(name);
            validateReelEdit(before.data, after.data, {
              lockStyle: Boolean(before.data.branding),
            });
            return result;
          } catch (error) {
            await writeMediaJson(await file(name), before.data);
            throw error;
          }
        }),
      );
    pending.set(name, task);
    return task.finally(() => {
      if (pending.get(name) === task) pending.delete(name);
    });
  };
  const operations = async (name, result) => {
    const target = await file(name);
    const origin = await fs
      .readFile(path.join(path.dirname(target), "origin.json"), "utf8")
      .then(JSON.parse, (e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      });
    if (origin?.kind === "quickcontent")
      throw fail(
        409,
        "Rolka QuickContent wymaga lokalnego endpointu operacji panelu",
      );
    const state = await read(name),
      sourceIdentity = `ordinary:${name}`;
    if (result === undefined)
      return editOperationContext(state.data, state.editRevision, {
        sourceIdentity,
      });
    if (result?.version !== 3) throw fail(400, "Wymagany kontrakt v3");
    const applied = applyEditResult(state.data, result, {
      currentRevision: state.editRevision,
      sourceIdentity,
      scope: "operations",
    });
    return {
      ...(await save(name, applied.data, state.editRevision)),
      invalidatedStages: applied.invalidatedStages,
    };
  };
  return { read, save, guard, operations };
}
