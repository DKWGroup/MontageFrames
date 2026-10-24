import test from "node:test";
import assert from "node:assert/strict";
import { runGeometry } from "./reel-geometry.mjs";
test("geometry CLI requires an explicit full scan or valid frame list before media access", async () => {
  for (const args of [
    ["demo"],
    ["demo", "--all", "--frames", "0"],
    ["../private", "--all"],
    ["demo", "--frames", ""],
    ["demo", "--frames", "1,x"],
  ])
    await assert.rejects(
      runGeometry(args, { root: "/unreadable-test-root" }),
      (e) => e.code !== "ENOENT",
    );
  assert.match(await runGeometry(["--help"]), /--all/);
});
