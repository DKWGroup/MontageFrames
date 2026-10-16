import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { snapshotPublic, verifyLongFormRender } from "./longform-render.mjs";

const data = { fps: 25, format: { width: 1920, height: 1080 }, segments: [{ start: 0, end: 4 }, { start: 6, end: 10 }] };
test("render: wymiary z format, audio, długość = suma segmentów (±0,15 s)", () => {
  assert.ok(verifyLongFormRender({ width: 1920, height: 1080, audioCodec: "aac", duration: 8.04 }, data));
  assert.throws(() => verifyLongFormRender({ width: 1080, height: 1920, audioCodec: "aac", duration: 8 }, data), /obrazu/);
  assert.throws(() => verifyLongFormRender({ width: 1920, height: 1080, audioCodec: null, duration: 8 }, data));
  assert.throws(() => verifyLongFormRender({ width: 1920, height: 1080, audioCodec: "aac", duration: 9 }, data));
});

test("snapshot public: rolka (bez .longform i kopii zapasowych), fonty i SFX; twarde linki", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "lf-render-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const put = async (rel, body = "x") => {
    await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await fs.writeFile(path.join(root, rel), body);
  };
  for (const f of ["public/reels/r/source.mp4", "public/reels/r/assets/pexels/1.mp4", "public/reels/r/.longform/cache.json", "public/reels/inna/source.mp4", "public/fonts/Inter.ttf", "public/sfx/index.json"]) await put(f);
  const out = path.join(root, "snap");
  await snapshotPublic(root, "r", out);
  const list = async (d) => (await fs.readdir(d, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => path.relative(out, path.join(e.parentPath, e.name))).sort();
  assert.deepEqual(await list(out), ["fonts/Inter.ttf", "reels/r/assets/pexels/1.mp4", "reels/r/source.mp4", "sfx/index.json"]);
  const [a, b] = await Promise.all([fs.stat(path.join(root, "public/reels/r/source.mp4")), fs.stat(path.join(out, "reels/r/source.mp4"))]);
  assert.equal(a.ino, b.ino);
});
