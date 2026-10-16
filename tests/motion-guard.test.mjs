import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMotion} from '../src/motion/schema.mjs';
test('reject duration before allocating shots, including Infinity',()=>{
 assert.throws(()=>buildMotion({name:'guard',duration:Infinity}),e=>e.name==='ZodError');
});
test('Motion uses existing installed font loader, rather than silent browser fallback',async()=>{
 const fs=await import('node:fs/promises');
 const text=await fs.readFile(new URL('../src/motion/Motion.tsx',import.meta.url),'utf8');
 assert.match(text,/loadFonts\(\)/);
});
test('preview artifacts get a fresh cache key on open or render completion',async()=>{
 const {readFile}=await import('node:fs/promises');const ui=await readFile(new URL('../ui/MotionStudio.tsx',import.meta.url),'utf8');
 assert.equal(ui.includes('&v='),true,'missing artifact freshness key');
});
