import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { acceptClientUpload } from "./upload.mjs";
test("same name and size never reuse different uploaded bytes", async (t) => {
  const root = await fs.mkdtemp("/tmp/panel-upload-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/klienci/test/surowe pliki", { recursive: true });
  await fs.writeFile(root + "/klienci/test/surowe pliki/a.mp4", "abcd");
  const req = Readable.from(["efgh"]);
  req.headers = { "content-length": "4" };
  await assert.rejects(
    acceptClientUpload(root, req, {
      client: "test",
      kind: "surowe",
      name: "a.mp4",
    }),
    { status: 409 },
  );
  assert.equal(
    await fs.readFile(root + "/klienci/test/surowe pliki/a.mp4", "utf8"),
    "abcd",
  );
});
test("parallel uploads publish one complete file and clean temporary files", async (t) => {
  const root = await fs.mkdtemp("/tmp/panel-upload-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/klienci/test", { recursive: true });
  const results = await Promise.allSettled(
    ["aaaa", "bbbb"].map((s) =>
      acceptClientUpload(root, Readable.from([s]), {
        client: "test",
        kind: "surowe",
        name: "a.mp4",
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 409);
  assert.ok(
    ["aaaa", "bbbb"].includes(
      await fs.readFile(root + "/klienci/test/surowe pliki/a.mp4", "utf8"),
    ),
  );
  assert.deepEqual(await fs.readdir(root + "/klienci/test/surowe pliki"), [
    "a.mp4",
  ]);
});
test("interrupted upload never publishes partial bytes", async (t) => {
  const root = await fs.mkdtemp("/tmp/panel-upload-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/klienci/test", { recursive: true });
  const req = Readable.from(
    (async function* () {
      yield "part";
      throw Error("interrupted");
    })(),
  );
  await assert.rejects(
    acceptClientUpload(root, req, {
      client: "test",
      kind: "surowe",
      name: "a.mp4",
    }),
    /interrupted/,
  );
  assert.deepEqual(await fs.readdir(root + "/klienci/test/surowe pliki"), []);
});
