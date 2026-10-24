import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  recordPublicationRender,
  publicationRenderCurrent,
} from "./reel-publication-state.mjs";
test("a later MP4 mtime never makes edited speech match an older rendered snapshot", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "publication-render-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "public/reels/demo"), { recursive: true });
  await fs.mkdir(path.join(root, "out"));
  const rendered = { captions: ["old"] },
    edited = { captions: ["new"] };
  await fs.writeFile(
    path.join(root, "public/reels/demo/reel.json"),
    JSON.stringify(edited),
  );
  await fs.writeFile(path.join(root, "out/demo.mp4"), "video");
  await recordPublicationRender(root, "demo", rendered, "out/demo.mp4");
  assert.equal(
    await publicationRenderCurrent(root, "demo", rendered, "out/demo.mp4"),
    true,
  );
  assert.equal(
    await publicationRenderCurrent(root, "demo", edited, "out/demo.mp4"),
    false,
  );
  await fs.appendFile(path.join(root, "out/demo.mp4"), "changed");
  assert.equal(
    await publicationRenderCurrent(root, "demo", rendered, "out/demo.mp4"),
    false,
  );
});

test("versioned receipt resolves newest output and detects renderer changes", async (t) => {
  const { publicationOutput } = await import("./reel-publication-state.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "publication-version-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/public/reels/demo", { recursive: true });
  await fs.mkdir(root + "/out");
  await fs.mkdir(root + "/src/styles", { recursive: true });
  const data = {
    source: "source.mp4",
    style: "persona",
    segments: [],
    captions: [],
  };
  await fs.writeFile(
    root + "/public/reels/demo/reel.json",
    JSON.stringify(data),
  );
  await fs.writeFile(root + "/src/styles/persona.tsx", "v1");
  await fs.writeFile(root + "/out/demo-v001.mp4", "old");
  await recordPublicationRender(root, "demo", data, "out/demo-v001.mp4");
  assert.equal(
    await publicationOutput(root, "demo", "out/demo.mp4"),
    "out/demo-v001.mp4",
  );
  assert.equal(
    await publicationRenderCurrent(root, "demo", data, "out/demo-v001.mp4"),
    true,
  );
  await fs.writeFile(root + "/src/styles/persona.tsx", "v2");
  assert.equal(
    await publicationRenderCurrent(root, "demo", data, "out/demo-v001.mp4"),
    false,
  );
  assert.equal(await fs.readFile(root + "/out/demo-v001.mp4", "utf8"), "old");
});

test("QuickContent description accepts a verified revision despite renderer updates and rejects missing or edited films", async (t) => {
  const { quickContentDescriptionReady } =
    await import("./reel-publication-state.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "qc-description-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "out"));
  await fs.writeFile(path.join(root, "out/film.mp4"), "verified video");
  const render = {
    verified: true,
    renderRevision: 3,
    signature: "older-engine",
    filePath: "out/film.mp4",
  };
  const candidate = {
    editRevision: 3,
    isCurrent: false,
    currentRender: null,
    renders: [render],
  };
  assert.equal(await quickContentDescriptionReady(root, candidate), true);
  assert.equal(
    await quickContentDescriptionReady(root, { ...candidate, editRevision: 4 }),
    false,
  );
  assert.equal(
    await quickContentDescriptionReady(root, {
      ...candidate,
      renders: [{ ...render, verified: false }],
    }),
    false,
  );
  assert.equal(
    await quickContentDescriptionReady(root, { ...candidate, renders: [] }),
    false,
  );
  assert.equal(await quickContentDescriptionReady(root, undefined), false);
  await fs.unlink(path.join(root, "out/film.mp4"));
  assert.equal(await quickContentDescriptionReady(root, candidate), false);
});
