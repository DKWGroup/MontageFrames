import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMotion} from '../src/motion/schema.mjs';
test('AI prompt uses supplied brief as data and forbids invented UI, metrics and reviews',async()=>{
 const {motionAiPrompt}=await import('../ui/motion-ai.mjs');
 const d=buildMotion({name:'ai-qa',brand:'MontageFrames',product:'Film o własnej pracy'});
 const p=motionAiPrompt(d,'Bez obietnic wyników i bez wykrzykników');
 assert.match(p,/Film o własnej pracy/);
 assert.match(p,/Bez obietnic wyników/);
 assert.match(p,/nie wymyślaj/i);
 assert.match(p,/reviews/);
 assert.match(p,/shots/);
});
test('AI command retains selected operator billing but disables tools and bounds spend',async()=>{
 const {motionAiCommand}=await import('../ui/motion-ai.mjs');
 const c=motionAiCommand({operator:'claude-account',model:'sonnet'},'brief',{ANTHROPIC_API_KEY:'test-not-real-key',PATH:'/bin'});
 assert.equal(c.cmd,'claude'); assert.equal(c.env.ANTHROPIC_API_KEY,undefined);
 assert.equal(c.args[c.args.indexOf('--model')+1],'sonnet');
 assert.equal(c.args[c.args.indexOf('--tools')+1],'');
 assert.equal(c.args[c.args.indexOf('--max-budget-usd')+1],'2');
 assert(c.args.includes('--restricted')); assert(!c.args.includes('--dangerously-skip-permissions'));
});
test('Motion planning cannot inherit alternative auth or proxy billing',async()=>{
 const {motionAiCommand}=await import('../ui/motion-ai.mjs');
 const env={ANTHROPIC_AUTH_TOKEN:'unit-secret',CLAUDE_CODE_OAUTH_TOKEN:'unit-secret',ANTHROPIC_BASE_URL:'https://example.invalid',ANTHROPIC_CUSTOM_HEADERS:'unit-secret'};
 const c=motionAiCommand({operator:'claude-account'},'test',env);
 for(const k of Object.keys(env)) assert.equal(c.env[k],undefined,k);
});
test('AI plan changes only shot copy and clears reviews',async()=>{
 const {applyMotionPlan}=await import('../ui/motion-ai.mjs');
 const d=buildMotion({name:'ai-parse',brand:'Real',duration:9});
 const shots=d.shots.map(({asset,...s},i)=>({...s,title:`Ujęcie ${i+1}`,body:'Prawdziwy opis'}));
 const next=applyMotionPlan(d,JSON.stringify({shots}));
 assert.equal(next.brand,d.brand);assert.equal(next.name,d.name);assert.equal(next.shots[0].title,'Ujęcie 1');assert.deepEqual(next.reviews,[]);
});
test('AI plan rejects extra fields and changed timelines instead of trusting model output',async()=>{
 const {applyMotionPlan}=await import('../ui/motion-ai.mjs');
 const d=buildMotion({name:'ai-guard',duration:9});
 assert.throws(()=>applyMotionPlan(d,JSON.stringify({shots:d.shots,reviews:[{score:10}]})),/plan/);
 assert.throws(()=>applyMotionPlan(d,JSON.stringify({shots:d.shots.map((s,i)=>({...s,start:i? s.start:1}))})),/plan/);
 assert.throws(()=>applyMotionPlan(d,JSON.stringify({shots:d.shots.map(s=>({...s,asset:'../.env'}))})),/plan/);
});
test('AI runner validates explicit CLI result and has a timeout without real model calls',async()=>{
 const {generateMotionPlan}=await import('../ui/motion-ai.mjs');
 const d=buildMotion({name:'ai-runner',duration:9});
 let calls=0;
 const fixture=JSON.stringify({type:'result',subtype:'success',result:JSON.stringify({shots:d.shots})});
 const executor=async(cmd,args,opts)=>{calls++; assert.equal(cmd,'claude'); assert.equal(opts.timeout,120000);assert.equal(opts.maxBuffer,524288);return {stdout:fixture,stderr:''};};
 const next=await generateMotionPlan(d,{operator:'claude-account',model:'opus'},'',process.cwd(),executor);
 assert.equal(calls,1);assert.equal(next.name,d.name);
});
test('failed AI call returns a safe actionable message without CLI prompt or secrets',async()=>{
 const {generateMotionPlan}=await import('../ui/motion-ai.mjs');
 const d=buildMotion({name:'ai-fail',duration:9});
 const executor=async()=>{throw new Error('TEST_SECRET_NOT_REAL\nCommand failed with private prompt');};
 await assert.rejects(generateMotionPlan(d,{operator:'claude-account'},'',process.cwd(),executor),e=>!e.message.includes('TEST_SECRET')&&/logowanie/.test(e.message));
});
