import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { measureRasterFrame } from "./render-raster.mjs";
const exec = promisify(execFile);
test("empty, unsafe and wrong-frame masks cannot become measured visible evidence", async () => {
  const { stdout: buffer } = await exec(
    "ffmpeg",
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=black@0:s=4x4,format=rgba",
      "-frames:v",
      "1",
      "-c:v",
      "png",
      "-f",
      "image2pipe",
      "pipe:1",
    ],
    { encoding: "buffer" },
  );
  const item = { id: "c0", role: "caption" },
    manifest = { signature: "one", output: { width: 4, height: 4 } };
  const frame = {
    frame: 2,
    expected: [item],
    boxes: [],
    hidden: [],
    issues: [],
  };
  const base = {
    frame: 2,
    manifestSignature: "one",
    isolation: {
      id: "c0",
      status: "measured",
      issues: [],
      width: 4,
      height: 4,
    },
  };
  const run = (f = frame, m = base) =>
    measureRasterFrame({
      frame: f,
      manifest,
      renderMask: async () => ({ buffer, measurement: m }),
    });
  const empty = await run();
  assert.equal(empty.rasters[0].status, "unknown");
  assert.equal(empty.hidden.length, 0);
  const hidden = await run({ ...frame, hidden: [item] });
  assert.equal(hidden.rasters[0].status, "hidden");
  assert.deepEqual(hidden.hidden, [item]);
  const unsafe = await run(
    { ...frame, hidden: [item] },
    {
      ...base,
      isolation: { ...base.isolation, status: "unknown", issues: ["blend"] },
    },
  );
  assert.equal(unsafe.rasters[0].status, "unknown");
  await assert.rejects(run(frame, { ...base, frame: 3 }), /klatce/);
  await assert.rejects(
    run(frame, { ...base, manifestSignature: "old" }),
    /klatce/,
  );
});
