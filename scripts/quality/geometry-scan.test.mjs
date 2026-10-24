import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanReelGeometry } from "./geometry-scan.mjs";
const exec = promisify(execFile);
test("real composition emits frozen, revision-bound caption/hook/emoji bounds without changing the reel", async (t) => {
  if (process.platform !== "darwin") {
    t.skip(
      "Preflight fontów używa CoreText/macOS; pełny odbiór Linux pozostaje otwarty",
    );
    return;
  }
  const root = fileURLToPath(new URL("../../", import.meta.url)),
    name = `geometry-test-${Date.now()}`;
  const dir = path.join(root, "public/reels", name);
  await fs.mkdir(dir, { recursive: true });
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await exec("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=blue:s=160x90:r=10:d=1",
    "-c:v",
    "libx264",
    path.join(dir, "source.mp4"),
  ]);
  const data = {
    source: "source.mp4",
    style: "happynews",
    fps: 10,
    segments: [{ start: 0, end: 1 }],
    captions: [{ words: [{ text: "Trzmiel", start: 0.1, end: 0.7 }], key: 0 }],
    overlays: [{ type: "title", text: "Żółty trzmiel", start: 0, end: 0.8 }],
  };
  const original = JSON.stringify(data);
  await fs.writeFile(path.join(dir, "reel.json"), original);
  const result = await scanReelGeometry({
    root,
    reelName: name,
    frames: [3, 0, 8],
    pixels: true,
  });
  assert.match(
    result.directory,
    /^\.quickcontent\/quality\/geometry-[a-f0-9-]+$/,
  );
  t.after(() =>
    fs.rm(path.join(root, result.directory), { recursive: true, force: true }),
  );
  assert.equal(result.frameBounds.collector, "remotion-raster-v1");
  assert.equal(result.frameBounds.frames.length, 3);
  const f = result.frameBounds.frames.find((f) => f.frame === 3);
  assert.ok(f.expected.some((i) => i.id === "c0w0"));
  assert.ok(
    f.boxes.some(
      (b) => b.id === "c0w0" && b.width > 0 && b.extent === "raster",
    ),
  );
  assert.ok(
    f.rasters.some(
      (r) =>
        r.id === "c0w0" && r.pixels > 0 && /^[a-f0-9]{64}$/.test(r.pngSha256),
    ),
  );
  assert.ok(f.boxes.some((b) => b.id === "o0" && b.role === "hook"));
  assert.equal(
    result.geometry.status === "pass",
    false,
    "partial scan must not certify all frames",
  );
  assert.equal(
    await fs.readFile(path.join(dir, "reel.json"), "utf8"),
    original,
  );
  const full = await scanReelGeometry({ root, reelName: name });
  assert.match(
    full.directory,
    /^\.quickcontent\/quality\/geometry-[a-f0-9-]+$/,
  );
  t.after(() =>
    fs.rm(path.join(root, full.directory), { recursive: true, force: true }),
  );
  assert.deepEqual(
    full.frameBounds.frames.map((f) => f.frame).sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(
    (await fs.readdir(path.join(root, full.directory))).some((f) =>
      f.endsWith(".png"),
    ),
    false,
    "full scan must avoid persisting every frame image",
  );
  assert.ok(
    full.geometry.findings.some(
      (f) => f.ruleId === "animation.measurement-provenance",
    ),
    "unsupported painted effects must remain unknown",
  );
  // Two output frames exercise the full raster path without a costly long scan.
  data.fps = 2;
  const shortDraft = JSON.stringify(data);
  await fs.writeFile(path.join(dir, "reel.json"), shortDraft);
  const fullPixels = await scanReelGeometry({
    root,
    reelName: name,
    pixels: true,
  });
  assert.match(
    fullPixels.directory,
    /^\.quickcontent\/quality\/geometry-[a-f0-9-]+$/,
  );
  t.after(() =>
    fs.rm(path.join(root, fullPixels.directory), {
      recursive: true,
      force: true,
    }),
  );
  assert.deepEqual(
    fullPixels.frameBounds.frames.map((f) => f.frame),
    [0, 1],
  );
  assert.ok(
    fullPixels.frameBounds.frames.every(
      (f) => f.rasters.length === f.expected.length,
    ),
  );
  assert.equal(
    (await fs.readdir(path.join(root, fullPixels.directory))).some((f) =>
      f.endsWith(".png"),
    ),
    false,
  );
  assert.equal(
    await fs.readFile(path.join(dir, "reel.json"), "utf8"),
    shortDraft,
  );
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(root, result.directory, "manifest.json"),
      "utf8",
    ),
  );
  assert.equal(result.frameBounds.manifestSignature, manifest.signature);
  assert.ok(manifest.assets.some((a) => a.path === "src/WordEmoji.tsx"));
});
