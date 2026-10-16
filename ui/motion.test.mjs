import { test } from "node:test";
import assert from "node:assert/strict";
test("brief builds timed deterministic shots on an explicitly estimated beat grid", async () => {
  const { buildMotion, validateMotion } =
    await import("../src/motion/schema.mjs");
  const d = buildMotion({
    name: "demo-motion",
    brand: "MontageFrames",
    duration: 9,
    bpm: 120,
  });
  assert.equal(d.shots.length, 3);
  assert.equal(d.shots[2].end, 9);
  assert.equal(d.beatGrid.kind, "estimated");
  assert.deepEqual(
    d,
    buildMotion({
      name: "demo-motion",
      brand: "MontageFrames",
      duration: 9,
      bpm: 120,
    }),
  );
  assert.equal(validateMotion(d).fps, 30);
});

test("store isolates projects, validates paths and protects production gate", async () => {
  const { createMotionStore } = await import("./motion-server.mjs");
  const { mkdtemp, mkdir, readFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const root = await mkdtemp(tmpdir() + "/motion-test-");
  await mkdir(root + "/public", { recursive: true });
  const store = createMotionStore(root);
  const d = await store.create({ name: "test", brand: "Real" });
  assert.equal((await store.get("test")).brand, "Real");
  assert.deepEqual(await store.list(), ["test"]);
  await assert.rejects(store.get("../secrets"));
  await assert.rejects(store.create({ name: "test" }));
  await assert.rejects(
    store.start("test", { mode: "final", format: "9:16" }),
    /recenzj/,
  );
  await assert.rejects(store.save("test", { ...d, logo: "../.env" }));
  const changed = {
    ...d,
    shots: d.shots.map((s, i) => (i ? s : { ...s, title: "Edited" })),
  };
  await store.save("test", changed);
  assert.equal(
    JSON.parse(await readFile(root + "/motion-projects/test.json")).shots[0]
      .title,
    "Edited",
  );
});

test("renderer offers three compositions; UI additive navigation survives Studio sync", async () => {
  const { readFile } = await import("node:fs/promises");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const React = await import("react");
  const ts = (await import("typescript")).default;
  const source = await readFile(
    new URL("../src/motion/Motion.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /useCurrentFrame/);
  assert.doesNotMatch(source, /Math.random|Date.now/);
  const comps = await readFile(
    new URL("../src/motion/Compositions.tsx", import.meta.url),
    "utf8",
  );
  assert.match(comps, /Motion-/);
  const sync = await readFile(
    new URL("../scripts/studio-sync.mjs", import.meta.url),
    "utf8",
  );
  assert.match(sync, /MotionCompositions/);
  const app = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.match(app, /Motion Studio/);
  const ui = await readFile(
    new URL("./MotionStudio.tsx", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(ui, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  assert.match(output, /render/);
  assert.match(ui, /Player/);
  assert.match(ui, /reviews/);
});

test("export plan uses CRF16 yuv420p and independent shot seek frames", async () => {
  const { renderPlan } = await import("../scripts/motion-render.mjs");
  const { buildMotion } = await import("../src/motion/schema.mjs");
  const d = buildMotion({ name: "x", duration: 9 });
  const p = renderPlan(d, "1:1", "draft");
  assert.equal(p.codec, "h264");
  assert.equal(p.crf, 16);
  assert.equal(p.pixelFormat, "yuv420p");
  assert.equal(p.composition, "Motion-1x1");
  assert.equal(p.frames.length, 3);
  assert.equal(p.frames[1], 135);
  assert.equal(p.audioTarget, -14);
});

test("manual review needs a rendered preview and content changes invalidate approvals", async () => {
  const { createMotionStore, outputDir } = await import("./motion-server.mjs");
  const { renderSignature } = await import("./motion-server.mjs");
  const { mkdtemp, mkdir, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const root = await mkdtemp(tmpdir() + "/motion-review-");
  await mkdir(root + "/public", { recursive: true });
  const store = createMotionStore(root);
  const d = await store.create({ name: "reviewed" });
  const r = {
    round: 1,
    score: 8,
    notes: "Checked real materials on phone",
    phone: true,
    assets: true,
    timing: true,
  };
  await assert.rejects(store.save(d.name, { ...d, reviews: [r] }), /podgląd/);
  const dir = outputDir(root, d);
  await mkdir(dir, { recursive: true });
  await writeFile(
    dir + "/9x16-preview-evidence.json",
    JSON.stringify({ hash: await renderSignature(root,d), format: "9:16" }),
  );
  await store.save(d.name, { ...d, reviews: [r] });
  const changed = await store.save(d.name, {
    ...d,
    brand: "Changed",
    reviews: [r],
  });
  assert.equal(changed.reviews.length, 0);
});
