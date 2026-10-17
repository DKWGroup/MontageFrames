import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { defaultBranding, brandingProfileSchema } from "../src/branding/schema.mjs";
import { brandingRenderFiles } from "../src/branding/appearance.mjs";
import { createBrandingStore, snapshotBranding } from "./branding-store.mjs";
import { createStore } from "./quickcontent-store.mjs";
import { buildReel } from "./prep.mjs";
import { buildCandidateReel } from "./quickcontent-adapter.mjs";

test("profile accepts a native renderer without changing older generic profiles", () => {
  const old = defaultBranding("test", "Test");
  assert.equal(brandingProfileSchema.parse(old).styleId, undefined);
  assert.equal(brandingProfileSchema.parse({...old, styleId:"bisanz"}).styleId,"bisanz");
  assert.equal(brandingProfileSchema.safeParse({...old,styleId:"../../other"}).success,false);
});

test("ordinary and QC builds resolve renderer from frozen branding", () => {
  const branding={...defaultBranding("test","Test"),revision:1,styleId:"bisanz"};
  const words=[{text:"Prawdziwy",start:0,end:0.5}];
  const ordinary=buildReel({source:"source.mp4",words,silences:[],duration:2,style:"brand",branding});
  const qc=buildCandidateReel({words,duration:2,styleId:"brand",branding});
  assert.equal(ordinary.style,"bisanz");
  assert.equal(qc.style,"bisanz");
});

test("native manifest includes all actual caption fonts", () => {
  const branding={...defaultBranding("test","Test"),styleId:"herod"};
  const files=brandingRenderFiles(branding);
  assert(files.includes("fonts/Montserrat.ttf"));
  assert(files.includes("fonts/LibreBaskerville.ttf"));
  assert(files.includes("fonts/LibreBaskerville-Italic.ttf"));
});

test("QC versions native appearance and private context; later saves do not change project", async t => {
  const root=await fs.mkdtemp(path.join(tmpdir(),"native-brand-integration-"));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(const dir of ["src/styles","public/fonts","klienci/test"])
    await fs.mkdir(path.join(root,dir),{recursive:true});
  await fs.writeFile(path.join(root,"src/styles/bisanz.tsx"),"native renderer");
  await fs.writeFile(path.join(root,"public/fonts/Inter.ttf"),"font");
  await fs.writeFile(path.join(root,"public/fonts/Inter-Italic.ttf"),"italic font");
  await fs.writeFile(path.join(root,"PREFERENCJE.md"),"General rules");
  await fs.writeFile(path.join(root,"klienci/test/PREFERENCJE.md"),"Private client rules");
  const store=createBrandingStore(root);
  const p={...defaultBranding("test","Test"),styleId:"bisanz",notes:"Private notes"};
  await store.save("test",p,0);
  const qc=createStore(root);
  const templates=await qc.getTemplates("test");
  const template=templates.find(x=>x.brandingRevision===1);
  assert.equal(template?.styleId,"bisanz");
  assert.equal(template?.ready,true);
  const project=await qc.createProject({sourceKind:"upload",uploadId:"upload",clientId:"test",templateId:template.id});
  const snapshot=await snapshotBranding(root,"test",1);
  assert.deepEqual(project.templateSnapshot.branding,snapshot);
  assert.equal(project.templateSnapshot.knowledge.notes,"Private notes");
  assert.equal(project.templateSnapshot.preferences.client,"Private client rules");
  assert.equal(snapshot.notes,undefined);
  await store.save("test",{...p,styleId:"skyclass"},1);
  assert.equal((await qc.getProject(project.id)).templateSnapshot.branding.styleId,"bisanz");
});
