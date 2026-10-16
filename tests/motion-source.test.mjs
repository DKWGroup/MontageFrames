import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {buildMotion} from '../src/motion/schema.mjs';
test('source archive preserves import paths and includes default font and runnable props',async()=>{
 const {packageMotionSource}=await import('../scripts/motion-source.mjs');
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'motion-source-test-'));try{
 const target=path.join(temp,'source.zip');await packageMotionSource(process.cwd(),buildMotion({name:'source-test',duration:9}),target,'Motion-9x16','draft');
 const result=await promisify(execFile)('/usr/bin/unzip',['-Z1',target]);
 for(const entry of ['src/motion/Motion.tsx','src/fonts.ts','src/index.css','public/fonts/Nunito.ttf','package.json','project.props.json']) assert(result.stdout.split('\n').includes(entry),entry);
 const pkg=JSON.parse((await promisify(execFile)('/usr/bin/unzip',['-p',target,'package.json'])).stdout);
 const original=JSON.parse(await fs.readFile('package.json','utf8'));
 assert.equal(pkg.dependencies.tailwindcss,original.dependencies.tailwindcss);
 assert(!result.stdout.includes('.panel.json'));assert(!result.stdout.includes('.env'));
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
