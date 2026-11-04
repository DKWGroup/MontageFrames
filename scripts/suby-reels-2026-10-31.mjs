import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {buildCandidateReel, rebaseWords} from './quickcontent-adapter.mjs';
import {detectPortraitFraming} from './quickcontent-portrait.mjs';
import {generateReelDescription} from './reel-description.mjs';
import {requestQuickContentAI} from './quickcontent-ai.mjs';

const exec = promisify(execFile);
const repo = process.cwd();
const base = '/Volumes/t7 blck bad/MontageFrames/suby-2026-10-31';
process.env.TMPDIR=path.join(base,'tmp')+'/';
const publicDir = path.join(base, 'public');
const specs = [
  {name:'suby-netflix', id:'c-edf3e9f1-32cf-409c-b728-5a68a3ac2e28', start:407.49, end:439.55, kind:'netflix', hook:'NETFLIX TYLKO NA MIESIĄC', frames:[12,70,100,120,224,270,285,291,297,300,360,377,378,384,390,405,465,570,720,870,894,915,950]},
  {name:'suby-helikopter', id:'c-51207fe2-a915-4563-819b-f609870bb1aa', start:1237.90, end:1275.05, kind:'helicopter', hook:'HELIKOPTER ZA 120 USD?', frames:[12,140,300,450,620,740,880,1050]},
];
async function json(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2));}
async function runTool(cmd,args,opts={}){
  const result=await exec(cmd,args,{maxBuffer:24*1024*1024,env:{...process.env,TMPDIR:path.join(base,'tmp')+'/'} });
  for(const line of (result.stderr+'\n'+result.stdout).split('\n'))opts.onLine?.(line);
  return result;
}
async function copy(from,to){await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);}
async function prepare(){
 await fs.mkdir(path.join(base,'tmp'),{recursive:true});
 for(const file of ['Inter.ttf','Inter-Italic.ttf'])await copy(path.join(repo,'public/fonts',file),path.join(publicDir,'fonts',file));
 const project=JSON.parse(await fs.readFile('.quickcontent/projects/qc-b7fcb417-c9be-40fa-8575-62d040161cc2.json','utf8'));
 const transcript=JSON.parse(await fs.readFile(project.transcript.wordsPath,'utf8'));
 for(const spec of specs){
  const work=path.join(base,'tmp',spec.name);const dir=path.join(publicDir,'reels',spec.name);
  await fs.mkdir(work,{recursive:true});await fs.mkdir(dir,{recursive:true});
  const candidate=project.candidates.find(c=>c.id===spec.id);
  if(candidate.reelName || candidate.renders?.length)throw Error('Fragment już ma montaż: '+spec.name);
  const clip=path.join(dir,'source.mp4');
  if(await fs.stat(clip).catch(()=>null)){
   const info=JSON.parse((await runTool('ffprobe',['-v','error','-show_entries','format=duration','-of','json',clip])).stdout);
   if(Math.abs(Number(info.format.duration)-(spec.end-spec.start))>0.08)await fs.unlink(clip);
  }
  if(!await fs.stat(clip).catch(()=>null)){
   console.log('WYCINEK',spec.name);
   await runTool('ffmpeg',['-v','error','-nostdin','-ss',String(spec.start),'-i','/Volumes/t7 blck bad/suby.mp4','-t',String(spec.end-spec.start),'-map','0:v:0','-map','0:a:0','-vf','fps=30','-c:v','h264_videotoolbox','-b:v','30M','-c:a','aac','-b:a','192k','-af','asetpts=PTS-STARTPTS','-movflags','+faststart','-n',clip]);
  }
  if(!await fs.stat(path.join(dir,'audio-normalized.json')).catch(()=>null)){
   const normalized=path.join(work,'source-normalized.mp4');
   const audio=await runTool('ffmpeg',['-v','info','-nostdin','-i',clip,'-c:v','copy','-c:a','aac','-b:a','192k','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-movflags','+faststart','-y',normalized]);
   await fs.rename(normalized,clip);await json(path.join(dir,'audio-normalized.json'),{targetLUFS:-16,targetTruePeak:-1.5,measurement:audio.stderr.slice(-900)});
  }
  const rebased=rebaseWords(transcript.words,spec.start,spec.end);
  const words=rebased.words.map(w=>({...w}));
  // Fix orthography only; every ASR word retains its source timing and ID.
  for(const w of words){
   const replace={"Showtime":"Showtime", "'y":'','Sky':'Sky','Get':'Get','Your':'Your', 'wycenię':'w cenie'};
   if(replace[w.text]!==undefined)w.text=replace[w.text];
  }
  for(let i=0;i<words.length-1;i++)if(words[i].text==='Sky'&&words[i+1].text==='Showtime'){
   words[i].text='SkyShowtime';words[i+1].text='';
  }
  if(spec.kind==='netflix'){
   const boundaries=[407.64,410.56,412.08,413.38,414.6,415.66,417.12,420.1,421.52,423.18,423.62,424.88,426.44,427.22,428.54,429.7,430.94,432.02,433.7,435.72,437.36,438.04].map(t=>Number((t-spec.start).toFixed(6)));
   // Meaningful phrase boundaries replace the automatic word-count split below.
   spec.captionBoundaries=boundaries;
  }else{
   spec.captionBoundaries=[1237.9,1239.76,1240.82,1242.36,1244.52,1246.22,1247.8,1250.04,1250.74,1252.48,1254.8,1255.42,1257.18,1258.66,1261.7,1263.84,1264.52,1266.08,1268.02,1269.42,1270.72,1271.74,1272.98,1274.08].map(t=>Number((t-spec.start).toFixed(6)));
  }
  const data=buildCandidateReel({words:words.filter(w=>w.text),duration:spec.end-spec.start,styleId:'bisanz',clientId:'kacper-bisanz'});
  data.outputResolution=1080;
  data.segments=[{start:0,end:spec.end-spec.start,zoom:1,zoomTo:1}];
  // A short pause before the reveal remains; no sentence or context is removed.
  if(spec.kind==='helicopter')data.segments=[{start:0,end:22+10/30,zoom:1,zoomTo:1},{start:23+10/30,end:spec.end-spec.start,zoom:1,zoomTo:1}];
  const cache=path.join(dir,'framing.observations.json');
  if(!await fs.stat(cache).catch(()=>null)){
   console.log('TWARZE',spec.name);
   const measured=await detectPortraitFraming(clip,work,spec.end-spec.start,3840,2160,{root:base,runTool,report:async r=>console.log(r.progressDetail??r.stage)},words,'bisanz');
   await json(cache,measured);
  }
  const measured=JSON.parse(await fs.readFile(cache,'utf8'));
  if(measured.observations.status!=='measured')throw Error('Brak detekcji twarzy');
  Object.assign(data,{framing:measured.framing,framingNote:measured.framingNote});
  // Group by meaning; do not change word timestamps.
  const stop=new Set(['i','a','w','z','na','do','od','po','za','ze','we','o','u','ale','że','bo','jak','to','więc','nie','się']);
  const groups=[];let group=[];
  const flush=()=>{if(group.length){groups.push(group);group=[];}};
  for(let i=0;i<words.length;i++){
   const w=words[i];if(!w.text)continue;
   group.push(w);
   const next=words[i+1];const dangling=stop.has(w.text.toLowerCase().replace(/[.,!?]/g,''));
   if(!dangling && (group.length>=5 || (group.length>=3 && /[.!?,]$/.test(w.text)) || (next && next.start-w.end>0.55)))flush();
  }flush();
  if(groups.at(-1)?.length===1 && groups.length>1)groups[groups.length-2].push(...groups.pop());
  const phrases=spec.captionBoundaries.map((t,i)=>words.filter(w=>w.text&&w.start>=t-0.0001&&w.start<(spec.captionBoundaries[i+1]??Infinity)-0.0001)).filter(ws=>ws.length);
  data.captions=phrases.map((ws,i)=>({words:ws.map(({text,start,end})=>({text,start,end})),key:ws.reduce((best,w,j)=>w.text.length>ws[best].text.length?j:best,0),layout:'inline',motion:['rise','slide','color','rise','pop'][i%5],from:i%2?'left':'right',y:0.575,reveal:'kinetic-phrase'}));
  for(let i=0;i<data.captions.length-1;i++){
   const c=data.captions[i],next=data.captions[i+1];
   while(c.words.length>1&&stop.has(c.words.at(-1).text.toLowerCase().replace(/[.,!?]/g,'')))next.words.unshift(c.words.pop());
  }
  for(const c of data.captions)c.key=c.words.reduce((best,w,j)=>w.text.length>c.words[best].text.length?j:best,0);
  data.overlays=[{type:'title',start:0,end:3,text:spec.hook,hl:spec.kind==='netflix'?'MIESIĄC':'120 USD',size:68,y:0.145}];
  await json(path.join(dir,'reel.json'),data);
  await json(path.join(dir,'transcript.json'),words);
  await json(path.join(dir,'origin.json'),{kind:'quickcontent',projectId:project.id,candidateId:spec.id,sourceId:project.source.id,sourceStart:spec.start,sourceEnd:spec.end,sourceHash:project.source.hash,transcriptHash:transcript.hash,wordMap:rebased.wordMap,styleId:'bisanz',externalRender:true});
  const photos=spec.kind==='netflix'?['tv-1.jpg','tv-3.jpg']:['rio-1.jpg','heli-3.jpg'];
  for(const f of photos)await copy(path.join(repo,'public/longform-pack/subskrypcje/photos',f),path.join(dir,f));
  for(const f of spec.kind==='netflix'?['netflix.png','skyshowtime.png']:['getyourguide.png'])await copy(path.join(repo,'public/longform-pack/subskrypcje/logos',f),path.join(dir,f));
  for(const f of ['pop.wav','click.wav','cash.wav','whoosh-fast.wav'])await copy(path.join(repo,'public/longform-pack/subskrypcje/sfx',f),path.join(dir,f));
  console.log('GOTOWE DANE',spec.name,words.length,'słów',measured.framing.tracking.length,'próbek kadru');
 }
 await json(path.join(base,'specs.json'),specs);
}

async function render(mode){
 const {bundle}=await import('@remotion/bundler');
 const {renderMedia,renderStill,selectComposition,ensureBrowser}=await import('@remotion/renderer');
 const browser=await ensureBrowser({logLevel:'error'});
 const outDir=path.join(base,'tmp','bundle');
 const serveUrl=await bundle({entryPoint:path.join(repo,'src/pack/suby-index.ts'),outDir,publicDir});
 for(const spec of specs.filter(s=>!process.argv[3]||s.name===process.argv[3])){
  const dir=path.join(publicDir,'reels',spec.name);const data=JSON.parse(await fs.readFile(path.join(dir,'reel.json'),'utf8'));
  for(const s of data.segments)for(const w of data.captions.flatMap(c=>c.words)){
   if((w.start<s.start&&w.end>s.start)||(w.start<s.end&&w.end>s.end))throw Error('Cięcie przecina słowo: '+w.text);
  }
  const inputProps={reel:spec.name,data,kind:spec.kind};
  if(spec.kind==='netflix'){
   const measured=JSON.parse(await fs.readFile(path.join(dir,'framing.observations.json'),'utf8'));
   inputProps.review={faceSamples:measured.observations.samples.filter(s=>s.faces.length).map(s=>({time:s.time,bottom:Math.max(...s.faces.map(f=>f.y+f.height))}))};
  }
  const composition=await selectComposition({serveUrl,id:'SubyReel',inputProps,browserExecutable:browser.path});
  const shared={serveUrl,composition,inputProps,browserExecutable:browser.path};
  if(mode==='stills'){
   const measurements=[];
   for(const frame of spec.frames){const output=path.join(base,'tmp',spec.name,`preview-${frame}.jpg`);await renderStill({...shared,frame,scale:0.4,imageFormat:'jpeg',output,onBrowserLog:log=>{const marker='NETFLIX_GEOMETRY ';if(log.text?.includes(marker)){const row=JSON.parse(log.text.slice(log.text.indexOf(marker)+marker.length));if(row.frame===frame)measurements.push(row);}}});}
   if(measurements.length)await json(path.join(base,'tmp',spec.name,'caption-geometry-v003.json'),measurements);
  }else{
   const version=process.argv[4]??'v001';
   if(!/^v\d{3}$/.test(version))throw Error('Nieprawidłowy numer wersji');
   const outputLocation=path.join(base,'Render',spec.name+'-'+version+'.mp4');
   if(await fs.stat(outputLocation).catch(()=>null))throw Error('Render już istnieje: '+outputLocation);
   const measurements=[];
   let last=-1;await renderMedia({...shared,outputLocation,codec:'h264',crf:18,pixelFormat:'yuv420p',audioCodec:'aac',concurrency:3,offthreadVideoCacheSizeInBytes:512*1024*1024,onBrowserLog:log=>{const marker='NETFLIX_GEOMETRY ';if(log.text?.includes(marker))measurements.push(JSON.parse(log.text.slice(log.text.indexOf(marker)+marker.length)));},onProgress:({progress})=>{const n=Math.floor(progress*20)*5;if(n!==last){console.log(spec.name,n+'%');last=n;}}});
   if(measurements.length)await json(path.join(dir,`caption-geometry-${version}.json`),measurements);
   console.log('MP4',outputLocation);
   const sources=['src/pack/SubyReels.tsx','src/pack/suby-index.ts','src/styles/bisanz.tsx','src/reel-timing.ts','src/quickcontent/framing.mjs'];
   const code=[];for(const f of sources)code.push({path:f,sha256:createHash('sha256').update(await fs.readFile(path.join(repo,f))).digest('hex')});
   await json(path.join(dir,'render-manifest.json'),{reel:spec.name,composition:'SubyReel',kind:spec.kind,outputLocation,fps:30,width:1080,height:1920,durationInFrames:composition.durationInFrames,dataSha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),outputSha256:createHash('sha256').update(await fs.readFile(outputLocation)).digest('hex'),code,renderedAt:new Date().toISOString(),runtime:'macOS / local fonts and Chromium'});
  }
 }
}
async function finish(){
 await copy(path.join(repo,'klienci/kacper-bisanz/PREFERENCJE.md'),path.join(base,'klienci/kacper-bisanz/PREFERENCJE.md'));
 const photoSources=JSON.parse(await fs.readFile('public/longform-pack/subskrypcje/photos/pexels.json','utf8'));
 const logoSources=JSON.parse(await fs.readFile('public/longform-pack/subskrypcje/logos/sources.json','utf8'));
 for(const spec of specs.filter(s=>!process.argv[3]||s.name===process.argv[3])){
  const dir=path.join(publicDir,'reels',spec.name);const manifest=JSON.parse(await fs.readFile(path.join(dir,'render-manifest.json'),'utf8'));const output=manifest.outputLocation;
  const current=JSON.parse(await fs.readFile(path.join(dir,'reel.json'),'utf8'));
  if(createHash('sha256').update(JSON.stringify(current)).digest('hex')!==manifest.dataSha256)throw Error('Plik montażu jest nowszy od MP4; potrzebny render aktualnej wersji.');
  const probe=JSON.parse((await runTool('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output])).stdout);
  const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
  if(v?.width!==1080||v?.height!==1920||v?.codec_name!=='h264'||a?.codec_name!=='aac')throw Error('Niepoprawny eksport');
  await runTool('ffmpeg',['-v','error','-nostdin','-i',output,'-f','null','-']);
  const levels=await runTool('ffmpeg',['-v','info','-nostdin','-i',output,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']);
  await json(path.join(dir,'export-check.json'),{probe,decodedWithoutErrors:true,audioMeasurement:levels.stderr.slice(-750),visualReview:'Contact sheets inspected; text below face; no camera-scale animation',humanListeningReview:false});
  const photos=spec.kind==='netflix'?['tv-1.jpg','tv-3.jpg']:['rio-1.jpg','heli-3.jpg'];
  const links=spec.kind==='netflix'?'https://help.netflix.com/pl/node/407\nhttps://help.netflix.com/en/node/41049\nhttps://www.skyshowtime.com/pl/help/article/how-do-i-cancel-my-skyshowtime-subscription':'https://www.verticalrio.com/en/book-your-flight\nhttps://www.riocopter.com.br/';
  await fs.writeFile(path.join(dir,'sources.md'),`# Źródła — ${spec.name}\n\nŹródło wypowiedzi: /Volumes/t7 blck bad/suby.mp4, ${spec.start}–${spec.end} s.\n\n## Research, 2026-10-31\n${links}\n\n${spec.kind==='netflix'?'Netflix potwierdza anulowanie członkostwa i dostęp do końca opłaconego okresu. Usunięcie aplikacji nie anuluje opłat. Strona SkyShowtime ma ograniczenie regionalne w bezpośrednim odczycie; nie dodawano aktualnego cennika ani obietnicy anulowania każdego typu planu po miesiącu.':'250/120 USD pochodzą z osobistej relacji autora. Oficjalne strony potwierdzają lokalnych operatorów i rezerwacje bezpośrednie; nie potwierdzono jego konkretnej transakcji ani identyczności ofert. Nie pokazano tych kwot jako aktualnego cennika.'}\n\n## Zdjęcia — Pexels License\nhttps://www.pexels.com/license/\n${photos.map(f=>`- ${f}: ${photoSources[f].photographer}, ${photoSources[f].url}`).join('\n')}\n\n${spec.kind==='helicopter'?'Zdjęcie helikoptera przedstawia João Pessoa, nie Rio; metka to wyłącznie „Lot helikopterem”. Zdjęcia są ilustracją i nie są przedstawiane jako nagrania autora.':''}\n\n## Marki i efekty\nLogotypy z istniejącej paczki klienta; źródłowe metadane: logos-sources.json. Prawa do znaków pozostają przy właścicielach, użycie informacyjne. Viator pokazano nazwą, bez imitowania oficjalnego wordmarku.\nSFX: paczka użytkowniczki ULTIMATE Editing Pack / Master SFX Pack, z istniejącego projektu subskrypcje; pop i klik miksowane pod mową.\n`);
  await json(path.join(dir,'logos-sources.json'),logoSources);
  console.log('OPIS',spec.name);
  const description=await generateReelDescription(spec.name,{root:base,descriptionInstructions:'Konkretny głos Kacpra Bisanza. Pierwsza osoba. Bez nowych cen i obietnic. Kwoty lotu to moje doświadczenie z zakupu, nie aktualna oferta. Dokładnie 5 hashtagów.',requestAI:(request,ctx)=>requestQuickContentAI(request,{...ctx,root:repo})});
  console.log('OPIS STATUS',spec.name,description.status);
  if(description.status==='ready')await copy(path.join(dir,'publication.txt'),path.join(base,'Render',spec.name+'-opis.txt'));
 }
}
const action=process.argv[2]??'prepare';
if(action==='prepare')await prepare();
else if(action==='stills'||action==='render')await render(action);
else if(action==='finish')await finish();
else throw Error('prepare | stills | render | finish');
