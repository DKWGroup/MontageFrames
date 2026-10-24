import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const exec = promisify(execFile);
const script = fileURLToPath(new URL("./reel-check.mjs", import.meta.url));

test("local reel checker validates and compares drafts without writing or calling AI", async (t) => {
  const root = await fs.mkdtemp("/tmp/reel-check-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = path.join(root, "public/reels/demo");
  await fs.mkdir(dir, { recursive: true });
  const data = {
    source: "source.mp4",
    style: "persona",
    fps: 30,
    segments: [{ start: 0, end: 2 }],
    captions: [{ words: [{ text: "Test", start: 0.2, end: 0.5 }] }],
  };
  const original = JSON.stringify(data);
  await fs.writeFile(path.join(dir, "reel.json"), original);
  await fs.writeFile(path.join(root, "before.json"), original);
  const result = await exec(
    process.execPath,
    [script, "demo", "--before", "before.json"],
    { cwd: root },
  );
  assert.match(result.stdout, /poprawne/);
  assert.match(result.stdout, /nie.*ocen|nie.*obrazu/i);
  assert.equal(
    await fs.readFile(path.join(dir, "reel.json"), "utf8"),
    original,
  );
  data.captions[0].words[0].start = 0.3;
  const changed = JSON.stringify(data);
  await fs.writeFile(path.join(dir, "reel.json"), changed);
  await assert.rejects(
    exec(process.execPath, [script, "demo", "--before", "before.json"], {
      cwd: root,
    }),
    (e) => e.code === 1 && /czasy/.test(e.stderr),
  );
  assert.equal(await fs.readFile(path.join(dir, "reel.json"), "utf8"), changed);
  await assert.rejects(
    exec(process.execPath, [script, "../outside"], { cwd: root }),
    (e) => e.code === 1,
  );
});

test("quality CLI reports unknown evidence and cut failures without editing a real synthetic source",async t=>{
 const root=await fs.mkdtemp("/tmp/reel-quality-");t.after(()=>fs.rm(root,{recursive:true,force:true}));const dir=path.join(root,"public/reels/demo");await fs.mkdir(dir,{recursive:true});
 await exec("ffmpeg",["-v","error","-f","lavfi","-i","color=c=blue:s=160x90:r=10:d=1","-f","lavfi","-i","sine=frequency=440:duration=1","-c:v","libx264","-c:a","aac","-shortest",path.join(dir,"source.mp4")]);
 const data={source:"source.mp4",style:"persona",fps:30,segments:[{start:0,end:1}],captions:[]};
 await fs.writeFile(path.join(dir,"reel.json"),JSON.stringify(data));
 const result=await exec(process.execPath,[script,"demo","--quality"],{cwd:root});const report=JSON.parse(result.stdout);
 assert.equal(report.status,"unknown");assert.equal(report.signatureKind,"draft-and-source");assert.equal(report.media.findings.some(f=>f.ruleId==="media.audio"),false);
 data.framing={mode:"crop",centerX:0.2,centerY:0.5,cameraCuts:[0.4],tracking:[{time:0,centerX:0.2,centerY:0.5},{time:1,centerX:0.8,centerY:0.5}]};
 const original=JSON.stringify(data);await fs.writeFile(path.join(dir,"reel.json"),original);
 await assert.rejects(exec(process.execPath,[script,"demo","--quality"],{cwd:root}),e=>e.code===1&&JSON.parse(e.stdout).status==="fail");
 assert.equal(await fs.readFile(path.join(dir,"reel.json"),"utf8"),original);
});
