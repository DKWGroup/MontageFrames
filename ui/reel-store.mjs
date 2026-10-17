import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { safePath, writeMediaJson } from "../scripts/quickcontent-ingest.mjs";
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
  const read = async (name) => {
    const data = JSON.parse(await fs.readFile(await file(name), "utf8"));
    return { data, editRevision: revision(data) };
  };
  const save = (name, data, expectedRevision) => {
    const task = (pending.get(name) ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
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
          JSON.stringify(data.branding) !== JSON.stringify(before.data.branding) ||
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
      });
    pending.set(name, task);
    return task.finally(() => {
      if (pending.get(name) === task) pending.delete(name);
    });
  };
  return { read, save };
}
