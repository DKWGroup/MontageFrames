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
