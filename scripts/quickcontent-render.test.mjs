import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  renderInputSignature,
  isCurrentRender,
  nextRenderPath,
  verifyRenderInfo,
} from "./quickcontent-render.mjs";
const data = {
  source: "source.mp4",
  style: "persona",
  fps: 30,
  segments: [{ start: 0, end: 2 }],
  captions: [{ words: [{ text: "tekst", start: 0.2, end: 0.5 }] }],
  overlays: [],
};
test("signature follows input data, source, fonts and style changes, but not editor session logs", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-signature-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const dir of ["src/styles", "public/reels/clip", "public/fonts"])
    await fs.mkdir(path.join(root, dir), { recursive: true });
  await fs.writeFile(path.join(root, "src/styles/persona.tsx"), "style1");
  await fs.writeFile(path.join(root, "public/reels/clip/source.mp4"), "source");
  await fs.writeFile(path.join(root, "public/fonts/Nunito.ttf"), "font");
  const first = await renderInputSignature(root, "clip", data);
  await fs.writeFile(
    path.join(root, "public/reels/clip/operator.json"),
    "session",
  );
  assert.equal(await renderInputSignature(root, "clip", data), first);
  const edited = globalThis.structuredClone(data);
  edited.captions[0].words[0].text = "zmiana";
  assert.notEqual(await renderInputSignature(root, "clip", edited), first);
  await fs.writeFile(path.join(root, "src/styles/persona.tsx"), "style2");
  assert.notEqual(await renderInputSignature(root, "clip", data), first);
  assert.equal(
    isCurrentRender(
      { verified: true, renderRevision: 3, signature: first },
      3,
      first,
    ),
    true,
  );
  assert.equal(
    isCurrentRender(
      { verified: true, renderRevision: 3, signature: first },
      4,
      first,
    ),
    false,
  );
});
test("versioned output avoids overwriting prior render and routes to client Render", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-versions-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "klienci/test/Render"), { recursive: true });
  await fs.writeFile(
    path.join(root, "klienci/test/Render/clip-v001.mp4"),
    "old",
  );
  assert.equal(
    await nextRenderPath(root, "clip", "test"),
    "klienci/test/Render/clip-v002.mp4",
  );
  assert.equal(
    await fs.readFile(
      path.join(root, "klienci/test/Render/clip-v001.mp4"),
      "utf8",
    ),
    "old",
  );
});
test("verification requires audio, vertical dimensions and matching snapshot duration", () => {
  assert.equal(
    verifyRenderInfo(
      { width: 1080, height: 1920, duration: 2, audioCodec: "aac" },
      data,
    ),
    true,
  );
  assert.throws(() =>
    verifyRenderInfo(
      { width: 1080, height: 1920, duration: 4, audioCodec: "aac" },
      data,
    ),
  );
  assert.throws(() =>
    verifyRenderInfo(
      { width: 1920, height: 1080, duration: 2, audioCodec: "aac" },
      data,
    ),
  );
  assert.throws(() =>
    verifyRenderInfo({ width: 1080, height: 1920, duration: 2 }, data),
  );
});
test("review PNG artifacts never invalidate input signature but actual overlay PNG does", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-review-signature-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "public/reels/clip"), { recursive: true });
  await fs.writeFile(path.join(root, "public/reels/clip/source.mp4"), "source");
  const initial = await renderInputSignature(root, "clip", data);
  await fs.writeFile(
    path.join(root, "public/reels/clip/review-0.png"),
    "first review",
  );
  await fs.writeFile(
    path.join(root, "public/reels/clip/review-30.png"),
    "second review",
  );
  assert.equal(await renderInputSignature(root, "clip", data), initial);
  await fs.writeFile(
    path.join(root, "public/reels/clip/overlay.png"),
    "actual overlay",
  );
  assert.notEqual(await renderInputSignature(root, "clip", data), initial);
});
test("progress reporting is limited to four per second with final one always emitted", async () => {
  const { createProgressThrottle } = await import("./quickcontent-render.mjs");
  assert.equal(typeof createProgressThrottle, "function");
  let time = 0;
  const events = [];
  const report = createProgressThrottle(
    (value) => events.push({ value, time }),
    () => time,
  );
  report(0);
  for (time = 10; time < 1000; time += 10) report(time / 1000);
  report(1);
  report(1);
  assert.deepEqual(
    events.map((e) => e.value),
    [0, 0.25, 0.5, 0.75, 1],
  );
  for (let i = 1; i < events.length - 1; i++)
    assert.ok(events[i].time - events[i - 1].time >= 250);
  assert.equal(events.at(-1).value, 1);
});
test("publication atomically links a verified file and detaches temporary path", async (t) => {
  const { publishVerifiedRender } = await import("./quickcontent-render.mjs");
  assert.equal(typeof publishVerifiedRender, "function");
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-publish-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const temporary = path.join(root, "render.tmp"),
    output = path.join(root, "clip-v001.mp4");
  await fs.writeFile(temporary, "verified");
  const original = await fs.stat(temporary);
  await publishVerifiedRender(temporary, output);
  assert.equal((await fs.stat(output)).ino, original.ino);
  await assert.rejects(fs.stat(temporary), { code: "ENOENT" });
  await fs.writeFile(temporary, "second");
  await assert.rejects(publishVerifiedRender(temporary, output), {
    code: "EEXIST",
  });
  assert.equal(await fs.readFile(output, "utf8"), "verified");
  assert.equal(await fs.readFile(temporary, "utf8"), "second");
});
test("EXDEV publication stages on destination filesystem and never overwrites final", async (t) => {
  const { publishVerifiedRender } = await import("./quickcontent-render.mjs");
  assert.equal(typeof publishVerifiedRender, "function");
  const root = await fs.mkdtemp(path.join(tmpdir(), "qc-publish-cross-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const temporary = path.join(root, "render.tmp"),
    output = path.join(root, "clip-v001.mp4");
  await fs.writeFile(temporary, "verified");
  const copyCalls = [],
    links = [];
  const operations = {
    ...fs,
    link: async (from, to) => {
      links.push([from, to]);
      if (from === temporary)
        throw Object.assign(new Error("other filesystem"), { code: "EXDEV" });
      return fs.link(from, to);
    },
    copyFile: async (from, to, flags) => {
      copyCalls.push([from, to, flags]);
      return fs.copyFile(from, to, flags);
    },
  };
  await publishVerifiedRender(temporary, output, operations);
  assert.equal(await fs.readFile(output, "utf8"), "verified");
  assert.equal(copyCalls.length, 1);
  assert.equal(path.dirname(copyCalls[0][1]), path.dirname(output));
  assert.notEqual(copyCalls[0][1], output);
  assert.equal(links.at(-1)[1], output);
  assert.deepEqual(await fs.readdir(root), ["clip-v001.mp4"]);
  await fs.writeFile(temporary, "second");
  await assert.rejects(publishVerifiedRender(temporary, output, operations), {
    code: "EEXIST",
  });
  assert.equal(await fs.readFile(output, "utf8"), "verified");
  assert.deepEqual((await fs.readdir(root)).sort(), [
    "clip-v001.mp4",
    "render.tmp",
  ]);
});

test("render verification honors selected portrait output resolution", () => {
  assert.equal(
    verifyRenderInfo(
      { width: 720, height: 1280, duration: 2, audioCodec: "aac" },
      { ...data, outputResolution: 720 },
    ),
    true,
  );
  assert.throws(() =>
    verifyRenderInfo(
      { width: 1080, height: 1920, duration: 2, audioCodec: "aac" },
      { ...data, outputResolution: 720 },
    ),
  );
});
