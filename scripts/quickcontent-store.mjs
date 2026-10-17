import { URL } from "node:url";
import {
  readFile,
  mkdir,
  realpath,
  open,
  rename,
  readdir,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createBrandingStore, snapshotBranding } from "./branding-store.mjs";
import {
  SCHEMA_VERSION,
  IdSchema,
  ProjectInputSchema,
  ProjectSchema,
  JobSchema,
} from "../src/quickcontent/schema.mjs";
const registry = JSON.parse(
  await readFile(
    new URL("../src/quickcontent/templates.json", import.meta.url),
    "utf8",
  ),
);
const locks = new Map();
export function qcError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode, status: statusCode });
}
async function serialized(key, fn) {
  const previous = locks.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  locks.set(key, next);
  try {
    return await next;
  } finally {
    if (locks.get(key) === next) locks.delete(key);
  }
}
export function createStore(root) {
  root = path.resolve(root);
  const dataDir = path.join(root, ".quickcontent");
  async function safePath(file, { mustExist = false } = {}) {
    const resolved = path.resolve(root, file),
      canonicalRoot = await realpath(root);
    if (resolved !== root && !resolved.startsWith(root + path.sep))
      throw qcError("Ścieżka poza projektem.");
    let parent = resolved;
    while (true) {
      try {
        const actual = await realpath(parent);
        if (
          actual !== canonicalRoot &&
          !actual.startsWith(canonicalRoot + path.sep)
        )
          throw qcError("Dowiązanie prowadzi poza projekt.");
        break;
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
        if (mustExist && parent === resolved) throw e;
        const next = path.dirname(parent);
        if (next === parent) throw e;
        parent = next;
      }
    }
    return resolved;
  }
  async function initialize() {
    await safePath(dataDir);
    await mkdir(dataDir, { recursive: true });
    for (const dir of ["projects", "jobs", "events", "workspace"]) {
      const file = await safePath(path.join(dataDir, dir));
      await mkdir(file, { recursive: true });
    }
  }
  async function fileFor(dir, id) {
    IdSchema.parse(id);
    await initialize();
    return safePath(path.join(dataDir, dir, id + ".json"));
  }
  async function read(file) {
    try {
      return JSON.parse(
        await readFile(await safePath(file, { mustExist: true }), "utf8"),
      );
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }
  async function atomicWrite(file, value) {
    await safePath(file);
    const temp = file + "." + randomUUID() + ".tmp";
    const fd = await open(temp, "wx", 0o600);
    try {
      await fd.writeFile(JSON.stringify(value, null, 2) + "\n");
      await fd.sync();
    } finally {
      await fd.close();
    }
    await rename(temp, file);
  }
  async function getTemplates(clientId) {
    if (clientId !== undefined && clientId !== null) IdSchema.parse(clientId);
    const selected = registry.filter(
      (t) => clientId === undefined || t.clientId === (clientId || null),
    );
    const brands = await createBrandingStore(root).templates(clientId);
    selected.push(...brands.map(t => ({...t,assets:[]})));
    return Promise.all(
      selected.map(async (template) => {
        const required = [
          `src/styles/${template.styleId}.tsx`,
          "PREFERENCJE.md",
          ...(template.clientId
            ? [`klienci/${template.clientId}/PREFERENCJE.md`]
            : []),
          ...template.assets,
        ];
        const missing = [];
        for (const file of required) {
          try {
            const s = await stat(await safePath(file, { mustExist: true }));
            if (!s.isFile()) missing.push(file);
          } catch (e) {
            if (e.code === "ENOENT") missing.push(file);
            else throw e;
          }
        }
        return { ...template, ready: template.ready !== false && missing.length === 0, missing };
      }),
    );
  }
  async function createProject(input) {
    const valid = ProjectInputSchema.parse(input);
    const templates = await getTemplates(valid.clientId);
    const template = templates.find((t) => t.id === valid.templateId);
    if (!template) throw qcError("Szablon nie należy do tego klienta.");
    if (!template.ready)
      throw qcError("Brak preferencji, stylu lub materiałów szablonu.");
    const general = await readFile(
      await safePath("PREFERENCJE.md", { mustExist: true }),
      "utf8",
    );
    const client = valid.clientId
      ? await readFile(
          await safePath(`klienci/${valid.clientId}/PREFERENCJE.md`, {
            mustExist: true,
          }),
          "utf8",
        )
      : null;
    const style = await readFile(
      await safePath(`src/styles/${template.styleId}.tsx`, { mustExist: true }),
    );
    const now = new Date().toISOString();
    const branding = template.styleId === "brand"
      ? await snapshotBranding(root, valid.clientId, template.brandingRevision)
      : null;
    const brandProfile = branding ? await createBrandingStore(root).version(valid.clientId, branding.revision) : null;
    const project = ProjectSchema.parse({
      ...valid,
      schemaVersion: SCHEMA_VERSION,
      id: "qc-" + randomUUID(),
      revision: 0,
      title: "Nowy projekt",
      source: null,
      analysisRuns: [],
      candidates: [],
      selectedCandidateIds: [],
      batchIds: [],
      templateSnapshot: {
        ...template,
        ...(branding ? {branding,knowledge:{businessDescription:brandProfile.businessDescription,audience:brandProfile.audience,tone:brandProfile.tone,notes:brandProfile.notes,assets:brandProfile.assets}} : {}),
        preferences: { general, client },
        styleHash: createHash("sha256").update(style).digest("hex"),
        snapshotAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });
    await atomicWrite(await fileFor("projects", project.id), project);
    return project;
  }
  async function getProject(id) {
    const p = await read(await fileFor("projects", id));
    return p ? ProjectSchema.parse(p) : null;
  }
  async function list(dir, schema) {
    await initialize();
    const names = await readdir(await safePath(path.join(dataDir, dir)));
    const values = await Promise.all(
      names
        .filter((n) => n.endsWith(".json"))
        .map((n) => read(path.join(dataDir, dir, n))),
    );
    return values
      .filter(Boolean)
      .map((v) => schema.parse(v))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async function mutateProject(id, expectedRevision, update) {
    const file = await fileFor("projects", id);
    return serialized(file, async () => {
      const before = await getProject(id);
      if (!before) throw qcError("Nie znaleziono projektu.", 404);
      if (expectedRevision !== null && before.revision !== expectedRevision)
        throw qcError("Projekt zmienił się. Odśwież dane.", 409);
      const result = update(globalThis.structuredClone(before));
      if (result?.then)
        throw qcError("Aktualizacja manifestu musi być synchroniczna.");
      const p = ProjectSchema.parse({
        ...result,
        id: before.id,
        clientId: before.clientId,
        revision: before.revision + 1,
        createdAt: before.createdAt,
        updatedAt: new Date().toISOString(),
      });
      await atomicWrite(file, p);
      return p;
    });
  }
  async function saveJob(job) {
    const valid = JobSchema.parse(job);
    const file = await fileFor("jobs", valid.id);
    return serialized(file, async () => {
      await atomicWrite(file, valid);
      return valid;
    });
  }
  async function getJob(id) {
    const j = await read(await fileFor("jobs", id));
    return j ? JobSchema.parse(j) : null;
  }
  async function appendEvent(id, event) {
    const file = await fileFor("events", id);
    return serialized(file, async () => {
      const events = (await read(file)) || [];
      const item = {
        ...event,
        cursor: events.length + 1,
        at: new Date().toISOString(),
      };
      events.push(item);
      await atomicWrite(file, events);
      return item;
    });
  }
  async function loadEvents(id, after = 0) {
    if (!Number.isInteger(Number(after)) || Number(after) < 0)
      throw qcError("Niepoprawny kursor.");
    const events = (await read(await fileFor("events", id))) || [];
    return {
      events: events.filter((e) => e.cursor > Number(after)),
      cursor: events.length,
    };
  }
  async function projectDirectory(project) {
    if (typeof project === "string") project = await getProject(project);
    if (!project) throw qcError("Nie znaleziono projektu.", 404);
    IdSchema.parse(project.id);
    if (project.clientId) IdSchema.parse(project.clientId);
    const dir = await safePath(
      project.clientId
        ? `klienci/${project.clientId}/QuickContent/${project.id}`
        : `.quickcontent/workspace/${project.id}`,
    );
    await mkdir(dir, { recursive: true });
    return dir;
  }
  return {
    root,
    dataDir,
    safePath,
    createProject,
    getProject,
    listProjects: () => list("projects", ProjectSchema),
    mutateProject,
    updateProject: (id, update) => mutateProject(id, null, update),
    getTemplates,
    saveJob,
    getJob,
    listJobs: () => list("jobs", JobSchema),
    appendEvent,
    loadEvents,
    projectDirectory,
  };
}
