import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {validateMotion} from '../src/motion/schema.mjs';
const exec=promisify(execFile);
export async function packageMotionSource(root,input,target,composition,mode){
 const data=validateMotion(input);
 if(!/^Motion-(9x16|1x1|16x9)$/.test(composition)) throw new Error('Nieprawidłowa kompozycja');
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'motion-source-'));
 const copy=async(relative)=>{const dest=path.join(temp,relative);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(root,relative),dest);};
 try {
  for(const f of ['schema.mjs','schema.d.mts','Motion.tsx','Compositions.tsx','index.tsx']) await copy('src/motion/'+f);
  await copy('src/fonts.ts');await copy('src/index.css');await copy('public/fonts/Nunito.ttf');
  const base=await fs.realpath(path.join(root,'public'));
  for(const asset of new Set([data.logo,data.font,data.music,...data.shots.map(s=>s.asset)].filter(Boolean))){
   const real=await fs.realpath(path.join(base,asset));if(!real.startsWith(base+path.sep)) throw new Error('Asset poza public');
   await copy('public/'+asset);
  }
  const original=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const names=['@remotion/cli','@remotion/bundler','@remotion/renderer','remotion','react','react-dom','zod','tailwindcss'];
  const dependencies=Object.fromEntries(names.map(n=>[n,original.dependencies[n]]));
  await fs.writeFile(path.join(temp,'package.json'),JSON.stringify({name:'montageframes-motion-source',private:true,type:'module',scripts:{render:`remotion render src/motion/index.tsx ${composition} movie.mp4 --props=project.props.json --codec=h264 --crf=16 --pixel-format=yuv420p`},dependencies},null,2));
  await fs.writeFile(path.join(temp,'project.props.json'),JSON.stringify({data,draft:mode!=='final'},null,2));
  await fs.writeFile(path.join(temp,'README.md'),'# Źródła Motion Studio\n\nTo źródła tego jednego renderu, nie cały panel MontageFrames.\n\nPo rozpakowaniu: `npm install`, potem `npm run render`. Pierwsze uruchomienie może pobrać przeglądarkę Remotion. ZIP nie zawiera kluczy API ani ustawień operatora; zawiera wyłącznie użyte materiały i fonty. Muzyka i obrazy pozostają objęte prawami ich właścicieli.\n\nSamodzielny render odtwarza obraz i audio, ale końcowa normalizacja LUFS oraz kontrola jakości należą do pipeline MontageFrames, nie tego uproszczonego polecenia.\n');
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.rm(target,{force:true});
  await exec('/usr/bin/zip',['-qr',path.resolve(target),'.'],{cwd:temp});
 }finally{await fs.rm(temp,{recursive:true,force:true});}
}
