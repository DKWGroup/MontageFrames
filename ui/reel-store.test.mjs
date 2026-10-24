import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";
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

test("ordinary edits reject moved word times without replacing the saved draft", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-word-times-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = root + "/public/reels/demo";
  await fs.mkdir(dir, { recursive: true });
  const before = {
    ...data,
    style: "persona",
    captions: [{ words: [{ text: "Słowo", start: 0.2, end: 0.5 }], key: 0 }],
  };
  await fs.writeFile(dir + "/reel.json", JSON.stringify(before));
  const store = createReelStore(root);
  const { editRevision } = await store.read("demo");
  const after = globalThis.structuredClone(before);
  after.captions[0].words[0].start = 0.3;
  await assert.rejects(store.save("demo", after, editRevision), {
    status: 400,
  });
  assert.deepEqual((await store.read("demo")).data, before);
});

test("ordinary SkyClass cannot lose speech and Bisanz cannot enable zoom", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-client-rules-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const client of ["skyclass", "kacper-bisanz"]) {
    const dir = root + "/public/reels/" + client;
    await fs.mkdir(dir, { recursive: true });
    const before = {
      ...data,
      client,
      style: "brand",
      captions: [{ words: [{ text: "Test", start: 0.2, end: 0.5 }] }],
    };
    await fs.writeFile(dir + "/reel.json", JSON.stringify(before));
    const store = createReelStore(root);
    const { editRevision } = await store.read(client);
    const after = globalThis.structuredClone(before);
    if (client === "skyclass") after.captions = [];
    else after.segments[0].zoom = 1.1;
    await assert.rejects(store.save(client, after, editRevision), {
      status: 400,
    });
    assert.deepEqual((await store.read(client)).data, before);
  }
});

test("terminal operator edits are validated and rolled back on invalid or failed output", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-guard-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = root + "/public/reels/demo";
  await fs.mkdir(dir, { recursive: true });
  const before = {
    ...data,
    captions: [{ words: [{ text: "Test", start: 0.2, end: 0.5 }] }],
  };
  await fs.writeFile(dir + "/reel.json", JSON.stringify(before));
  const store = createReelStore(root);
  assert.equal(typeof store.guard, "function");
  await assert.rejects(
    store.guard("demo", async () => {
      const invalid = globalThis.structuredClone(before);
      invalid.captions[0].words[0].start = 0.4;
      await fs.writeFile(dir + "/reel.json", JSON.stringify(invalid));
    }),
    { status: 400 },
  );
  assert.deepEqual((await store.read("demo")).data, before);
  await assert.rejects(
    store.guard("demo", async () => {
      await fs.writeFile(dir + "/reel.json", "{partial");
      throw new Error("CLI przerwane");
    }),
    /CLI przerwane/,
  );
  assert.deepEqual((await store.read("demo")).data, before);
  await store.guard("demo", async () => {
    const valid = globalThis.structuredClone(before);
    valid.captions[0].words[0].text = "Test!";
    await fs.writeFile(dir + "/reel.json", JSON.stringify(valid));
  });
  assert.equal(
    (await store.read("demo")).data.captions[0].words[0].text,
    "Test!",
  );
});

test("existing rounded overlay end does not block saving a valid text correction", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-rounded-end-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = root + "/public/reels/demo";
  await fs.mkdir(dir, { recursive: true });
  const before = {
    ...data,
    fps: 30,
    segments: [{ start: 0, end: 36.837 }],
    captions: [{ words: [{ text: "Test", start: 1, end: 1.5 }] }],
    overlays: [{ type: "counter", start: 30, end: 36.84, to: 100 }],
  };
  await fs.writeFile(dir + "/reel.json", JSON.stringify(before));
  const store = createReelStore(root);
  const initial = await store.read("demo");
  const changed = globalThis.structuredClone(before);
  changed.captions[0].words[0].text = "Test!";
  await store.save("demo", changed, initial.editRevision);
  const saved = await store.read("demo");
  assert.equal(saved.data.captions[0].words[0].text, "Test!");
  const invalid = globalThis.structuredClone(changed);
  invalid.overlays[0].end = 37;
  await assert.rejects(store.save("demo", invalid, saved.editRevision), {
    status: 400,
  });
});

test("ordinary store manual operations share v3 validation and reject old context",async t=>{
 const root=await fs.mkdtemp(path.join(tmpdir(),"reel-ops-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,"public/reels/clip"),{recursive:true});
 const data={source:"source.mp4",style:"persona",fps:30,segments:[{start:0,end:2}],captions:[{words:[{text:"test",start:0,end:1}],key:0}],overlays:[]};
 await fs.writeFile(path.join(root,"public/reels/clip/reel.json"),JSON.stringify(data));
 const store=createReelStore(root);const c=await store.operations("clip");
 const result={version:3,baseRevision:c.baseRevision,summary:"Ręczna poprawka",operations:[{type:"replaceWordText",wordId:c.words[0].id,text:"Test!"}]};
 const saved=await store.operations("clip",result);assert.ok(saved.invalidatedStages.includes("publication"));
 assert.equal((await store.read("clip")).data.captions[0].words[0].text,"Test!");
 await assert.rejects(store.operations("clip",result),{status:409});
 await fs.writeFile(path.join(root,"public/reels/clip/origin.json"),JSON.stringify({kind:"quickcontent"}));
 await assert.rejects(store.operations("clip"),{status:409});
});

test("separate store instances cannot both publish operations from the same revision",async t=>{
 const root=await fs.mkdtemp(path.join(tmpdir(),"reel-ops-race-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,"public/reels/clip"),{recursive:true});
 await fs.writeFile(path.join(root,"public/reels/clip/reel.json"),JSON.stringify({source:"source.mp4",style:"persona",segments:[{start:0,end:2}],captions:[{words:[{text:"test",start:0,end:1}],key:0}]}));
 const a=createReelStore(root),b=createReelStore(root),c=await a.operations("clip");
 const edit=text=>({version:3,baseRevision:c.baseRevision,summary:"Poprawka",operations:[{type:"replaceWordText",wordId:c.words[0].id,text}]});
 const results=await Promise.allSettled([a.operations("clip",edit("pierwsza")),b.operations("clip",edit("druga"))]);
 assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
 assert.equal(results.find(r=>r.status==="rejected").reason.status,409);
});
