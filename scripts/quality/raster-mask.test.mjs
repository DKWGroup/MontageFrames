import test from "node:test";
import assert from "node:assert/strict";
import { alphaBounds, decodePngRgba } from "./raster-mask.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
test("alpha bounds include faint shadow pixels and detect viewport clipping, without treating blank masks as hidden", () => {
  const rgba = Buffer.alloc(4 * 4 * 3);
  rgba[(1 * 4 + 1) * 4 + 3] = 255;
  rgba[(2 * 4 + 3) * 4 + 3] = 1;
  assert.deepEqual(alphaBounds(rgba, 4, 3), {
    x: 1,
    y: 1,
    width: 3,
    height: 2,
    pixels: 2,
    touchesEdge: true,
  });
  assert.equal(alphaBounds(Buffer.alloc(16), 2, 2), null);
  assert.throws(() => alphaBounds(Buffer.alloc(8), 2, 2), /rozmiar/);
});
test("PNG decode preserves alpha and validates expected dimensions before exposing bounds", async () => {
  const { stdout } = await exec(
    "ffmpeg",
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=white@0.5:s=4x4,format=rgba",
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
  const rgba = await decodePngRgba(stdout, 4, 4);
  assert.equal(rgba.length, 64);
  assert.ok(rgba[3] > 100 && rgba[3] < 200);
  await assert.rejects(decodePngRgba(stdout, 8, 4), /wymiary/);
});
