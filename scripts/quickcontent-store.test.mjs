import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStore } from "./quickcontent-store.mjs";
const input = {
  sourceKind: "upload",
  uploadId: "upload-one",
  templateId: "persona",
  focus: { mode: "auto" },
  duration: { min: 30, max: 60 },
};
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "qc-store-"));
  await mkdir(path.join(root, "src/styles"), { recursive: true });
  await writeFile(path.join(root, "src/styles/persona.tsx"), "style");
  await writeFile(path.join(root, "PREFERENCJE.md"), "rules");
  return { root, store: createStore(root) };
}
test("project survives restart; revision conflicts preserve previous selection", async () => {
  const { root, store } = await fixture();
  const p = await store.createProject(input);
  assert.equal(p.clientId, null);
  assert.equal(p.revision, 0);
  const first = await store.mutateProject(p.id, 0, (p) => ({
    ...p,
    title: "Saved",
  }));
  assert.equal(first.revision, 1);
  await assert.rejects(
    store.mutateProject(p.id, 0, (p) => ({ ...p, title: "Lost" })),
    (e) => e.statusCode === 409,
  );
  assert.equal((await createStore(root).getProject(p.id)).title, "Saved");
});
test("serial writes reject stale revision instead of losing data", async () => {
  const { store } = await fixture();
  const p = await store.createProject(input);
  const results = await Promise.allSettled([
    store.mutateProject(p.id, 0, (p) => ({ ...p, title: "first" })),
    store.mutateProject(p.id, 0, (p) => ({ ...p, title: "second" })),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await store.getProject(p.id)).revision, 1);
});
test("validates settings, client-template match, and input fields", async () => {
  const { store } = await fixture();
  for (const patch of [
    { focus: { mode: "prompt", prompt: " " } },
    { duration: { min: 70, max: 60 } },
    { duration: { min: 5, max: 30 } },
    { templateId: "skyclass" },
    { clientId: "../escape" },
    { secret: "key" },
  ])
    await assert.rejects(store.createProject({ ...input, ...patch }));
});
test("incomplete tmp file never replaces project and paths cannot escape through symlink", async () => {
  const { root, store } = await fixture();
  const p = await store.createProject(input);
  await writeFile(
    path.join(root, ".quickcontent/projects", p.id + ".json.tmp"),
    "broken",
  );
  assert.equal((await store.getProject(p.id)).id, p.id);
  await symlink(tmpdir(), path.join(root, "escape"));
  await assert.rejects(store.safePath("escape/file"));
  await assert.rejects(store.getProject("../escape"));
});
test("events retain cursor order after restart", async () => {
  const { root, store } = await fixture();
  await store.appendEvent("job-one", { stage: "download" });
  await store.appendEvent("job-one", { stage: "transcribe" });
  const r = await createStore(root).loadEvents("job-one", 1);
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].stage, "transcribe");
  assert.equal(r.cursor, 2);
});
test("ready templates require real style and preference snapshot", async () => {
  const { store } = await fixture();
  const templates = await store.getTemplates(null);
  assert.equal(templates.length, 1);
  assert.equal(templates[0].ready, true);
  const p = await store.createProject(input);
  assert.equal(p.templateSnapshot.styleId, "persona");
  assert.equal(p.templateSnapshot.preferences.general, "rules");
});

test("internal serialized updates advance revision without stale read overwrite", async () => {
  const { store } = await fixture();
  const p = await store.createProject(input);
  await Promise.all([
    store.updateProject(p.id, (p) => ({ ...p, title: p.title + " A" })),
    store.updateProject(p.id, (p) => ({ ...p, title: p.title + " B" })),
  ]);
  const final = await store.getProject(p.id);
  assert.equal(final.revision, 2);
  assert.ok(final.title.startsWith("Nowy projekt "));
  assert.deepEqual(
    final.title.slice("Nowy projekt ".length).split(" ").sort(),
    ["A", "B"],
  );
});

test("output resolution is independent of source limit, durable and backwards compatible", async () => {
  const { store } = await fixture();
  assert.equal((await store.createProject(input)).outputResolution, 1080);
  const p = await store.createProject({
    ...input,
    resolution: 1080,
    outputResolution: 720,
  });
  assert.equal((await store.getProject(p.id)).outputResolution, 720);
  await assert.rejects(
    store.createProject({ ...input, outputResolution: 1000 }),
  );
});
