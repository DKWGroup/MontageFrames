import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createReelStore } from "./reel-store.mjs";
const data = {
  source: "source.mp4",
  segments: [{ start: 0, end: 2 }],
  captions: [],
};
test("ordinary reel rejects concurrent and external stale edits without overwriting data", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-store-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/public/reels/demo", { recursive: true });
  await fs.writeFile(
    root + "/public/reels/demo/reel.json",
    JSON.stringify(data),
  );
  const store = createReelStore(root);
  const initial = await store.read("demo");
  const replies = await Promise.allSettled([
    store.save("demo", { ...data, hold: 1 }, initial.editRevision),
    store.save("demo", { ...data, hold: 2 }, initial.editRevision),
  ]);
  assert.equal(replies.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(replies.find((r) => r.status === "rejected").reason.status, 409);
  const saved = await store.read("demo");
  assert.equal(saved.data.hold, 1);
  await fs.writeFile(
    root + "/public/reels/demo/reel.json",
    JSON.stringify({ ...data, hold: 3 }),
  );
  await assert.rejects(store.save("demo", data, saved.editRevision), {
    status: 409,
  });
  assert.equal((await store.read("demo")).data.hold, 3);
  await assert.rejects(store.save("demo", data, undefined), { status: 409 });
});
test("ordinary reel validates input and preserves source identity", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-validation-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(root + "/public/reels/demo", { recursive: true });
  await fs.writeFile(
    root + "/public/reels/demo/reel.json",
    JSON.stringify(data),
  );
  const store = createReelStore(root),
    r = await store.read("demo");
  await assert.rejects(
    store.save("demo", { ...data, source: "../other.mp4" }, r.editRevision),
    { status: 400 },
  );
  assert.deepEqual((await store.read("demo")).data, data);
});
