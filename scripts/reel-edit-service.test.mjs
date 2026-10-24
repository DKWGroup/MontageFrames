import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import * as service from "./reel-edit-service.mjs";
import { createReelStore } from "../ui/reel-store.mjs";
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "ordinary-edit-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = path.join(root, "public/reels/clip");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(root, "PREFERENCJE.md"), "Zachowaj wygląd");
  const data = {
    source: "source.mp4",
    style: "persona",
    fps: 30,
    segments: [{ start: 0, end: 3 }],
    captions: [{ words: [{ text: "test", start: 0.1, end: 1 }], key: 0 }],
    overlays: [{ type: "title", text: "Hook", start: 0, end: 3 }],
    framing: { mode: "crop", centerX: 0.2, centerY: 0.5 },
  };
  await fs.writeFile(path.join(dir, "reel.json"), JSON.stringify(data));
  await fs.writeFile(path.join(dir, "source.mp4"), "original source");
  return { root, dir, data, store: createReelStore(root) };
}
const result = (request, text = "Test!") => {
  const c = JSON.parse(request.prompt.split("Kontekst operacji: ")[1]);
  return {
    version: 3,
    baseRevision: c.baseRevision,
    summary: "Poprawiono",
    operations: [{ type: "replaceWordText", wordId: c.words[0].id, text }],
  };
};
test("ordinary limited AI edit shares v3 scope and preserves camera, source and times", async (t) => {
  const { root, store, data } = await fixture(t);
  let requests = 0;
  const out = await service.editOrdinaryReel(
    {
      root,
      reelName: "clip",
      message: "Popraw literówkę",
      scope: "operations",
    },
    { aiProvider: "claude" },
    {
      store,
      requestAI: async (r) => {
        requests++;
        return result(r);
      },
    },
  );
  const after = (await store.read("clip")).data;
  assert.equal(requests, 1);
  assert.equal(after.captions[0].words[0].text, "Test!");
  assert.equal(after.captions[0].words[0].start, 0.1);
  assert.deepEqual(after.framing, data.framing);
  assert.deepEqual(after.overlays, data.overlays);
  assert.deepEqual(after.segments, data.segments);
  assert.ok(out.invalidatedStages.includes("publication"));
  const receipt = JSON.parse(await fs.readFile(out.attemptPath));
  assert.equal(receipt.status, "completed");
});
test("ordinary AI stale answer preserves newer manual edit and durable usage", async (t) => {
  const { root, store } = await fixture(t);
  let attemptPath;
  await assert.rejects(
    service.editOrdinaryReel(
      { root, reelName: "clip", message: "Popraw", scope: "operations" },
      { aiProvider: "codex" },
      {
        store,
        requestAI: async (r, ctx) => {
          await ctx.recordUsage({
            provider: "codex",
            billingKind: "subscription",
            inputTokens: 10,
            outputTokens: 2,
            costMicroUsd: 0,
          });
          const before = await store.read("clip");
          await store.save(
            "clip",
            { ...before.data, hold: 2 },
            before.editRevision,
          );
          attemptPath = ctx.attemptPath;
          return result(r);
        },
      },
    ),
    { status: 409 },
  );
  assert.equal((await store.read("clip")).data.hold, 2);
  const receipt = JSON.parse(await fs.readFile(attemptPath));
  assert.equal(receipt.usage.length, 1);
  assert.equal(receipt.status, "failed");
});
test("ordinary limited edit rejects malformed or wrong-scope response and records usage first", async (t) => {
  const { root, store, data } = await fixture(t);
  let attemptPath;
  await assert.rejects(
    service.editOrdinaryReel(
      { root, reelName: "clip", message: "Popraw", scope: "operations" },
      { aiProvider: "claude" },
      {
        store,
        requestAI: async (r, ctx) => {
          await ctx.recordUsage({ provider: "claude", costMicroUsd: null });
          attemptPath = ctx.attemptPath;
          return { data: null };
        },
      },
    ),
  );
  assert.deepEqual((await store.read("clip")).data, data);
  assert.equal(
    JSON.parse(await fs.readFile(attemptPath)).usage[0].costMicroUsd,
    null,
  );
});

test("limited ordinary scopes refuse API mode and QC ownership before contacting a model", async (t) => {
  const { root, dir, store } = await fixture(t);
  let requests = 0;
  const dependencies = {
    store,
    requestAI: async () => {
      requests++;
      throw Error("must not call");
    },
  };
  await assert.rejects(
    service.editOrdinaryReel(
      { root, reelName: "clip", scope: "operations", message: "Popraw" },
      { settings: { operator: "claude-api-key" } },
      dependencies,
    ),
    /konto/,
  );
  await assert.rejects(
    service.editOrdinaryReel(
      { root, reelName: "clip", scope: "full", message: "Popraw" },
      {},
      dependencies,
    ),
    /zakres/,
  );
  await fs.writeFile(
    path.join(dir, "origin.json"),
    JSON.stringify({ kind: "quickcontent" }),
  );
  await assert.rejects(
    service.editOrdinaryReel(
      { root, reelName: "clip", scope: "operations", message: "Popraw" },
      {},
      dependencies,
    ),
    { status: 409 },
  );
  assert.equal(requests, 0);
});

test("caption adapter reports publication invalidation without recomputing the rest", async (t) => {
  const { root, store } = await fixture(t);
  const out = await service.editOrdinaryReel(
    { root, reelName: "clip", scope: "captions", message: "Popraw" },
    {},
    {
      store,
      requestAI: async () => ({
        version: 2,
        summary: "Poprawiono",
        wordEdits: [{ wordId: "w0", text: "Test!" }],
        groups: null,
      }),
    },
  );
  assert.deepEqual(out.invalidatedStages, [
    "geometry",
    "render",
    "publication",
  ]);
});

test("ordinary AI edit cannot be applied after replacing source bytes without changing JSON", async (t) => {
  const { root, dir, store, data } = await fixture(t);
  await assert.rejects(
    service.editOrdinaryReel(
      { root, reelName: "clip", message: "Popraw", scope: "operations" },
      {},
      {
        store,
        requestAI: async (r) => {
          await fs.writeFile(
            path.join(dir, "source.mp4"),
            "different recording",
          );
          return result(r);
        },
      },
    ),
    { status: 409 },
  );
  assert.deepEqual((await store.read("clip")).data, data);
});
