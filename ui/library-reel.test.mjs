import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { libraryReel } from "./library-reel.mjs";
test("library joins opaque QC reel to real title, thumbnail and verified output", async (t) => {
  const root = await fs.mkdtemp("/tmp/library-reel-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/public/reels/qc-opaque", { recursive: true });
  await fs.writeFile(
    root + "/public/reels/qc-opaque/reel.json",
    JSON.stringify({
      source: "source.mp4",
      client: "test",
      segments: [{ start: 0, end: 12 }],
      captions: [],
    }),
  );
  await fs.writeFile(
    root + "/public/reels/qc-opaque/origin.json",
    JSON.stringify({
      kind: "quickcontent",
      projectId: "qc-project",
      candidateId: "candidate",
    }),
  );
  const result = await libraryReel(root, "qc-opaque", async () => ({
    candidates: [
      {
        id: "candidate",
        reelName: "qc-opaque",
        title: "Czytelny temat filmu",
        thumbnailPath: "thumb.jpg",
        isCurrent: true,
        currentRender: { filePath: "out/qc-opaque-v002.mp4" },
      },
    ],
  }));
  assert.equal(result.title, "Czytelny temat filmu");
  assert.equal(result.name, "qc-opaque");
  assert.equal(result.renderState, "current");
  assert.equal(result.out, "out/qc-opaque-v002.mp4");
  assert.match(result.thumbnail, /media\/thumbnails\/candidate$/);
});
test("ordinary reel has readable fallback and missing result never claims completion", async (t) => {
  const root = await fs.mkdtemp("/tmp/library-reel-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/public/reels/moja-rolka", { recursive: true });
  await fs.writeFile(
    root + "/public/reels/moja-rolka/reel.json",
    JSON.stringify({
      source: "source.mp4",
      segments: [{ start: 0, end: 2 }],
      captions: [],
    }),
  );
  const result = await libraryReel(root, "moja-rolka");
  assert.equal(result.title, "moja rolka");
  assert.equal(result.renderState, "missing");
  assert.equal(result.thumbnail, null);
});

test("edited QuickContent keeps its verified archived film in stale results", async (t) => {
  const root = await fs.mkdtemp("/tmp/library-stale-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/public/reels/qc-old", { recursive: true });
  await fs.mkdir(root + "/out");
  await fs.writeFile(
    root + "/public/reels/qc-old/reel.json",
    JSON.stringify({
      source: "source.mp4",
      segments: [{ start: 0, end: 1 }],
      captions: [],
    }),
  );
  await fs.writeFile(
    root + "/public/reels/qc-old/origin.json",
    JSON.stringify({
      kind: "quickcontent",
      projectId: "project",
      candidateId: "c",
    }),
  );
  await fs.writeFile(root + "/out/qc-old-v001.mp4", "verified");
  const result = await libraryReel(root, "qc-old", async () => ({
    candidates: [
      {
        id: "c",
        reelName: "qc-old",
        title: "Stary wynik",
        isCurrent: false,
        currentRender: null,
        renders: [{ verified: true, filePath: "out/qc-old-v001.mp4" }],
      },
    ],
  }));
  assert.equal(result.renderState, "stale");
  assert.equal(result.out, "out/qc-old-v001.mp4");
});
