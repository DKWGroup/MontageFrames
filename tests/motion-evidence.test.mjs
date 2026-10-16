import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildMotion} from '../src/motion/schema.mjs';
import * as storeModule from '../ui/motion-server.mjs';
test('render evidence signature changes when a referenced asset or renderer changes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'motion-signature-test-'));
 try {await fs.mkdir(path.join(root,'public/motion-assets/test'),{recursive:true});await fs.mkdir(path.join(root,'src/motion'),{recursive:true});
 await fs.writeFile(path.join(root,'public/motion-assets/test/a.png'),'unit-fixture-not-a-real-image');
 await fs.writeFile(path.join(root,'src/motion/Motion.tsx'),'unit-renderer-v1');
 const d=buildMotion({name:'signature-test',duration:9});d.shots[0].asset='motion-assets/test/a.png';
 const first=await storeModule.renderSignature(root,d);
 await fs.writeFile(path.join(root,'public/motion-assets/test/a.png'),'different-unit-fixture');
 const second=await storeModule.renderSignature(root,d);assert.notEqual(first,second);
 await fs.writeFile(path.join(root,'src/motion/Motion.tsx'),'unit-renderer-v2');
 assert.notEqual(second,await storeModule.renderSignature(root,d));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('source or asset change invalidates saved manual approvals and preview evidence',async()=>{
const root=await fs.mkdtemp(path.join(os.tmpdir(),'motion-review-test-'));
try {await fs.mkdir(path.join(root,'public/motion-assets/test'),{recursive:true});
await fs.writeFile(path.join(root,'public/motion-assets/test/a.png'),'unit-fixture-not-a-real-image');
const d=buildMotion({name:'review-test',duration:9});d.shots[0].asset='motion-assets/test/a.png';
const store=storeModule.createMotionStore(root);await store.save(d.name,d);
const dir=storeModule.outputDir(root,d);await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'9x16-preview-evidence.json'),JSON.stringify({hash:await storeModule.renderSignature(root,d),format:'9:16'}));
for(let i=1;i<=3;i++){d.reviews.push({round:i,score:8,notes:'Unit fixture review only',phone:true,assets:true,timing:true,format:'9:16',hash:await storeModule.renderSignature(root,d)});await store.save(d.name,d);}
assert.equal((await store.get(d.name)).reviews.length,3);
await fs.writeFile(path.join(root,'public/motion-assets/test/a.png'),'updated-unit-fixture');
assert.equal((await store.get(d.name)).reviews.length,0);
assert.equal(await storeModule.previewEvidence(root,d,'9:16'),false);
}finally{await fs.rm(root,{recursive:true,force:true});}
});
