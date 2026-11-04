import React, {useEffect, useMemo} from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useDelayRender} from 'remotion';
import {Bisanz, BisanzOverlay} from '../styles/bisanz';
import {loadFonts} from '../fonts';
import type {ReelData} from '../Reel';
import {captionClips, reelFrames, toOut} from '../reel-timing';
import {trackingPosition} from '../quickcontent/framing.mjs';

type Props={reel:string;data:ReelData;kind:'netflix'|'helicopter';review?:{faceSamples:{time:number;bottom:number}[]}};
const blue='#066FED',ink='#141414';
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};
const ease=Easing.bezier(0.16,1,0.3,1);
const Tag:React.FC<{children:React.ReactNode}>=({children})=><div style={{fontFamily:'Menlo,monospace',fontSize:22,letterSpacing:3,color:'#737373',textTransform:'uppercase'}}>{children}</div>;
const Panel:React.FC<{children:React.ReactNode;label:string;frame:number;duration:number}>=({children,label,frame,duration})=>{
 const enter=interpolate(frame,[0,12],[0,1],{...clamp,easing:ease});
 const exit=interpolate(frame,[duration-7,duration],[1,0],clamp);
 return <div style={{position:'absolute',left:72,top:1225,width:866,height:290,boxSizing:'border-box',padding:'28px 36px',background:'white',border:'1px solid #E6E6E6',borderRadius:32,boxShadow:'0 24px 70px #00173550',transform:`translateY(${(1-enter)*65+(1-exit)*25}px)`,opacity:Math.min(enter,exit),fontFamily:'Inter',color:ink,overflow:'hidden'}}><div style={{position:'absolute',left:0,top:0,width:5,height:'100%',background:blue}}/><Tag>{label}</Tag>{children}</div>;
};
const EpisodeIcon:React.FC<{n:number;active:boolean;progress:number}>=({n,active,progress})=><div style={{height:104,width:128,borderRadius:18,background:active?blue:'#EDF3FA',color:active?'white':'#99A9BC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,fontWeight:750,transform:`translateY(${(1-progress)*28}px) scale(${0.9+progress*.1})`,opacity:progress,boxShadow:active?'0 10px 20px #066fed30':undefined}}>{String(n).padStart(2,'0')}</div>;
const Viz:React.FC<{name:string;reel:string;duration:number}>=({name,reel,duration})=>{
 const frame=useCurrentFrame();const t=frame/30;const file=(s:string)=>staticFile(`reels/${reel}/${s}`);
 let label='',content:React.ReactNode=null;
 if(name==='platforms'){
  label='Streaming';content=<div style={{display:'flex',alignItems:'center',gap:55,marginTop:32}}><Img src={file('netflix.png')} style={{width:310,height:110,objectFit:'contain'}}/><div style={{height:100,width:2,background:'#E6E6E6'}}/><Img src={file('skyshowtime.png')} style={{width:300,height:110,objectFit:'contain'}}/></div>;
 }else if(name==='episodes'){
  label='Poczekaj na cały sezon';content=<div style={{display:'flex',gap:22,marginTop:28}}>{[1,2,3,4,5].map((n,i)=><EpisodeIcon key={n} n={n} active={frame>i*9} progress={interpolate(frame,[i*5,i*5+10],[0,1],{...clamp,easing:ease})}/>)}</div>;
 }else if(name==='month'){
  label='Jeden miesiąc oglądania';content=<div style={{display:'flex',alignItems:'center',gap:38,marginTop:18}}><div style={{fontSize:125,fontWeight:750,lineHeight:1,color:blue}}>1</div><div style={{flex:1}}><div style={{fontSize:41,fontWeight:650,marginBottom:20}}>MIESIĄC</div><div style={{display:'flex',gap:8}}>{Array.from({length:12},(_,i)=><div key={i} style={{height:25,flex:1,borderRadius:7,background:i===0?blue:'#E8EEF6',transform:`scaleY(${i===0?1+Math.sin(Math.min(t,1)*Math.PI)*.35:1})`}}/>)}</div></div></div>;
 }else if(name==='two'){
  const n=t<1.25?1:2;label='Jeden odcinek?';content=<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:35,marginTop:16}}><div style={{fontSize:130,lineHeight:1,fontWeight:750,color:blue}}>{n}</div><div style={{fontSize:44,fontWeight:650,lineHeight:1.1}}>{n===1?'ODCINEK':'ODCINKI'}<br/><span style={{fontWeight:400,color:'#737373',fontSize:30}}>wieczorem</span></div></div>;
 }else if(name==='cycle'){
  label='Płać, kiedy oglądasz';content=<div style={{display:'flex',alignItems:'center',gap:18,marginTop:40}}>{['WŁĄCZ','OBEJRZYJ','ANULUJ'].map((s,i)=><React.Fragment key={s}>{i>0&&<div style={{color:blue,fontSize:33}}>→</div>}<div style={{flex:1,padding:'22px 8px',textAlign:'center',borderRadius:16,background:i===Math.min(2,Math.floor(t/1.5))?blue:'#EFF4FA',color:i===Math.min(2,Math.floor(t/1.5))?'white':ink,fontSize:27,fontWeight:700}}>{s}</div></React.Fragment>)}</div>;
 }else if(name==='price250'||name==='price120'){
  const value=name==='price250'?250:120;label=name==='price250'?'Oferta u pośrednika':'Rezerwacja bezpośrednia';
  const n=Math.round(interpolate(frame,[0,20],[0,value],{...clamp,easing:ease}));content=<div style={{display:'flex',alignItems:'baseline',gap:20,marginTop:14}}><span style={{fontSize:131,fontWeight:750,letterSpacing:-7,color:blue,fontVariantNumeric:'tabular-nums',lineHeight:1.05}}>{n}</span><span style={{fontSize:43,fontWeight:650}}>USD</span>{value===120&&<span style={{fontSize:28,color:'#737373'}}>/ osoba</span>}</div>;
 }else if(name==='agents'){
  label='Sprawdź więcej niż jedną ofertę';content=<div style={{display:'flex',alignItems:'center',justifyContent:'space-around',marginTop:40}}><Img src={file('getyourguide.png')} style={{width:320,height:100,objectFit:'contain'}}/><div style={{height:80,width:2,background:'#E6E6E6'}}/><div style={{fontSize:63,fontWeight:750,letterSpacing:-3}}>Viator</div></div>;
 }else if(name==='search'){
  label='Szukaj bezpośrednio';content=<div style={{marginTop:28}}><div style={{border:'2px solid #D8E5F5',borderRadius:20,padding:'19px 25px',fontSize:39,fontWeight:600,display:'flex',alignItems:'center',gap:20}}><svg width="35" height="35" viewBox="0 0 40 40"><circle cx="17" cy="17" r="12" fill="none" stroke={blue} strokeWidth="3"/><path d="M26 26L37 37" stroke={blue} strokeWidth="3"/></svg><span>{'helikopter Rio'.slice(0,Math.min(14,Math.floor(frame/2)+1))}</span><span style={{color:blue,opacity:Math.sin(frame/4)>0?1:.2}}>|</span></div><div style={{fontSize:25,color:'#737373',marginTop:15}}>Wyszukiwanie → strona lokalnego operatora</div></div>;
 }else if(name==='twopeople'){
  label='Lot we dwoje';content=<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:55,marginTop:28}}>{[0,1].map((n)=><svg key={n} width="100" height="130" viewBox="0 0 100 130" style={{transform:`translateY(${interpolate(frame,[n*6,n*6+12],[25,0],{...clamp,easing:ease})}px)`,opacity:interpolate(frame,[n*6,n*6+10],[0,1],clamp)}}><circle cx="50" cy="29" r="24" fill={blue}/><path d="M10 125V99C10 48 90 48 90 99V125Z" fill={blue}/></svg>)}<div style={{fontSize:40,fontWeight:650,lineHeight:1.15}}>KACPER<br/><span style={{color:blue}}>+ ŻONA</span></div></div>;
 }
 return <Panel label={label} frame={frame} duration={duration}>{content}</Panel>;
};
const Broll:React.FC<{reel:string;photo:string;label:string;duration:number}>=({reel,photo,label,duration})=>{
 const frame=useCurrentFrame();const p=frame/duration;
 const opacity=Math.min(interpolate(frame,[0,6],[0,1],clamp),interpolate(frame,[duration-6,duration],[1,0],clamp));
 return <AbsoluteFill style={{opacity,overflow:'hidden',background:'#081B31'}}><Img src={staticFile(`reels/${reel}/${photo}`)} style={{height:'100%',width:'100%',objectFit:'cover',transform:`scale(${1.045+p*.04}) translateX(${-p*12}px)`}}/><AbsoluteFill style={{background:'linear-gradient(180deg, #00102030, transparent 35%, #001020b0 75%, #001020ef)'}}/><div style={{position:'absolute',top:270,left:75,padding:'16px 25px',background:'white',borderRadius:50,fontFamily:'Menlo',fontSize:24,color:ink,letterSpacing:2}}><span style={{color:blue}}>● </span>{label}</div></AbsoluteFill>;
};
const Camera:React.FC<{data:ReelData;reel:string;start:number;viewportHeight?:number}>=({data,reel,start,viewportHeight=1536})=>{
 const frame=useCurrentFrame();
 const p=trackingPosition(data.framing,start+frame/30);
 // Convert the existing 9:16 object-position to this fixed 1080×1536 viewport.
 // Scale remains constant; camera cuts retain their exact source boundary.
 const oldRatio=(9/16)/(16/9),newRatio=(1080/viewportHeight)/(16/9);
 const faceCenter=p.centerX*(1-oldRatio)+oldRatio/2;
 const center=Math.max(0,Math.min(1,(faceCenter-newRatio/2)/(1-newRatio)));
 return <div style={{position:'absolute',inset:0,height:viewportHeight,overflow:'hidden'}}><OffthreadVideo src={staticFile(`reels/${reel}/${data.source}`)} trimBefore={Math.round(start*30)} volume={1} toneMapped={false} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${center*100}% 50%`}}/></div>;
};
const LegacySubyReel:React.FC<Props>=({reel,data,kind})=>{
 const frame=useCurrentFrame();const {delayRender,continueRender,cancelRender}=useDelayRender();
 const [handle]=React.useState(()=>delayRender('Markowe fonty'));
 useEffect(()=>{loadFonts([{family:'Inter',file:'fonts/Inter.ttf',weight:'100 900'},{family:'Inter',file:'fonts/Inter-Italic.ttf',weight:'100 900',style:'italic'}]).then(()=>continueRender(handle),cancelRender);},[handle,continueRender,cancelRender]);
 const file=(s:string)=>staticFile(`reels/${reel}/${s}`);
 const ranges=kind==='netflix'?
  [{start:3.3,end:7.0,name:'platforms'},{start:14.8,end:18.5,name:'episodes'},{start:18.5,end:22.1,name:'month'},{start:22.1,end:26.2,name:'two'},{start:26.2,end:32.06,name:'cycle'}]:
  [{start:3.3,end:7.7,name:'price250'},{start:7.7,end:10.2,name:'agents'},{start:12.6,end:15.9,name:'search'},{start:20.7,end:26.0,name:'price120'},{start:26,end:31.8,name:'twopeople'}];
 const broll=kind==='netflix'?[{start:8.3,end:12.0,photo:'tv-1.jpg',label:'WIECZÓR Z SERIALEM'}]:[{start:16.0,end:19.8,photo:'rio-1.jpg',label:'RIO DE JANEIRO'},{start:4.1,end:7.6,photo:'heli-3.jpg',label:'LOT HELIKOPTEREM'}];
 const clips=useMemo(()=>captionClips(data),[data]);
 const output=(t:number)=>Math.round(toOut(t,data.segments)*30);
 const activeBroll=broll.some(b=>frame>=output(b.start)&&frame<output(b.end));
 const activePanel=ranges.some(r=>frame>=output(r.start)&&frame<output(r.end));
 return <AbsoluteFill style={{background:'#06254B',fontFamily:'Inter'}}>
  {data.segments.map((s,i)=><Sequence key={i} from={output(s.start)} durationInFrames={output(s.end)-output(s.start)}><Camera reel={reel} data={data} start={s.start}/></Sequence>)}
  <AbsoluteFill style={{background:'linear-gradient(180deg, transparent 43%, rgba(3,26,56,.25) 56%, #06254B 78%)'}}/>
  <div style={{position:'absolute',left:-190,top:1510,width:1080,height:600,borderRadius:'50%',background:'radial-gradient(ellipse,#066fed35,transparent 67%)',transform:`translateX(${Math.sin(frame/120)*30}px)`}}/>
  {broll.map(b=><Sequence key={b.start} from={output(b.start)} durationInFrames={output(b.end)-output(b.start)} layout="none"><Broll reel={reel} photo={b.photo} label={b.label} duration={output(b.end)-output(b.start)}/></Sequence>)}
  {ranges.map(r=><Sequence key={r.start} from={output(r.start)} durationInFrames={output(r.end)-output(r.start)} layout="none"><Viz name={r.name} reel={reel} duration={output(r.end)-output(r.start)}/></Sequence>)}
  {data.overlays?.filter(o=>o.type==='title').map((o,i)=><Sequence key={i} from={output(o.start)} durationInFrames={output(o.end)-output(o.start)} layout="none"><BisanzOverlay o={{...o,y:0.745,size:65}} dur={output(o.end)-output(o.start)} src={file} at={t=>toOut(t,data.segments)-toOut(o.start,data.segments)}/></Sequence>)}
  {clips.map(c=><Sequence key={c.index} from={c.from} durationInFrames={c.durationInFrames} layout="none"><Bisanz group={{...c.g,y:activeBroll&&!activePanel?0.69:0.575}} words={c.words.map(w=>({...w,at:toOut(w.start,data.segments)-c.start,key:w===c.g.words[c.g.key??0],hl:c.g.hl?.includes(c.g.words.indexOf(w))??false}))} durationInFrames={c.durationInFrames} raised={false} minTop={0.51}/></Sequence>)}
  {ranges.map((r,i)=><Sequence key={`s${i}`} from={output(r.start)} durationInFrames={25} layout="none"><Audio src={file(i%2?'click.wav':'pop.wav')} volume={0.12}/></Sequence>)}
 </AbsoluteFill>;
};
// This correction is scoped to the Netflix reel. The delivered helicopter keeps
// its original layout and is never re-rendered by the Netflix-only command.
const NetflixPoster:React.FC<{reel:string;duration:number}>=({reel,duration})=>{
 const frame=useCurrentFrame();
 const enter=interpolate(frame,[0,10],[0,1],{...clamp,easing:ease});
 const exit=interpolate(frame,[duration-8,duration],[1,0],clamp);
 return <AbsoluteFill style={{background:'#141414',opacity:Math.min(enter,exit)}}>
  <Img src={staticFile(`reels/${reel}/strefa-gangsterow-plakat-hi.jpg`)} style={{position:'absolute',left:160,top:185,width:690,height:983,objectFit:'contain',transform:`translateY(${(1-enter)*24}px) scale(${.98+.02*enter})`,boxShadow:'0 16px 45px #0006'}}/>
  <div style={{position:'absolute',left:60,top:1470,width:870,color:'#FFFFFF',fontFamily:'Menlo,monospace',fontSize:22,textAlign:'center'}}>Źródło plakatu: Filmweb / SkyShowtime</div>
 </AbsoluteFill>;
};
const NetflixViz:React.FC<{name:string;reel:string;duration:number}>=({name,reel,duration})=>{
 const frame=useCurrentFrame();const t=frame/30;
 const enter=interpolate(frame,[0,10],[0,1],{...clamp,easing:ease});
 const exit=interpolate(frame,[duration-7,duration],[1,0],clamp);
 const tag:React.CSSProperties={fontFamily:'Menlo,monospace',fontSize:18,letterSpacing:2,color:'#737373'};
 let content:React.ReactNode;
 if(name==='platforms')content=<div style={{display:'flex',alignItems:'center',justifyContent:'space-around',height:'100%'}}><Img src={staticFile(`reels/${reel}/netflix.png`)} style={{width:260,height:70,objectFit:'contain'}}/><div style={{height:65,width:1,background:'#E6E6E6'}}/><Img src={staticFile(`reels/${reel}/skyshowtime.png`)} style={{width:260,height:70,objectFit:'contain'}}/></div>;
 else if(name==='episodes')content=<><div style={tag}>POCZEKAJ NA CAŁY SEZON</div><div style={{display:'flex',gap:15,marginTop:8}}>{[1,2,3,4,5].map((n,i)=><div key={n} style={{height:52,flex:1,display:'flex',justifyContent:'center',alignItems:'center',fontSize:32,fontWeight:700,borderRadius:10,color:frame>i*9?'white':blue,background:frame>i*9?blue:'#EEF3F9',transform:`translateY(${interpolate(frame,[i*5,i*5+8],[12,0],{...clamp,easing:ease})}px)`}}>{String(n).padStart(2,'0')}</div>)}</div></>;
 else if(name==='month')content=<div style={{display:'flex',alignItems:'center',gap:25,height:'100%'}}><div style={{fontWeight:750,fontSize:85,lineHeight:1,color:blue}}>1</div><div style={{flex:1}}><div style={{fontWeight:650,fontSize:30}}>MIESIĄC OGLĄDANIA</div><div style={{display:'flex',gap:8,marginTop:12}}>{Array.from({length:12},(_,i)=><div key={i} style={{height:15,flex:1,borderRadius:4,background:i===0?blue:'#E8EEF6'}}/>)}</div></div></div>;
 else if(name==='two')content=<div style={{display:'flex',height:'100%',gap:30,alignItems:'center',justifyContent:'center'}}><div style={{fontSize:85,lineHeight:1,fontWeight:750,color:blue}}>{t<1.25?1:2}</div><div style={{fontSize:32,fontWeight:650}}>{t<1.25?'ODCINEK':'ODCINKI'}<span style={{fontSize:24,fontWeight:400,color:'#737373'}}> wieczorem</span></div></div>;
 else content=<><div style={tag}>PŁAĆ, KIEDY OGLĄDASZ</div><div style={{display:'flex',alignItems:'center',gap:15,marginTop:8}}>{['WŁĄCZ','OBEJRZYJ','ANULUJ'].map((s,i)=><React.Fragment key={s}>{i>0&&<span style={{fontSize:25,color:blue}}>→</span>}<div style={{flex:1,textAlign:'center',padding:'13px 8px',borderRadius:10,fontSize:24,fontWeight:700,background:i===Math.min(2,Math.floor(t))?blue:'#EFF4FA',color:i===Math.min(2,Math.floor(t))?'white':ink}}>{s}</div></React.Fragment>)}</div></>;
 return <div style={{position:'absolute',left:72,top:1405,width:866,height:112,boxSizing:'border-box',padding:'12px 24px',borderRadius:20,background:'white',color:ink,fontFamily:'Inter',border:'1px solid #E6E6E6',boxShadow:'0 8px 24px #0003',opacity:Math.min(enter,exit),transform:`translateY(${(1-enter)*30}px)`}}>{content}</div>;
};
const NetflixReel:React.FC<Props>=({reel,data,review})=>{
 const frame=useCurrentFrame();const {delayRender,continueRender,cancelRender}=useDelayRender();
 const [handle]=React.useState(()=>delayRender('Fonty rolki Netflix'));
 const [fontsReady,setFontsReady]=React.useState(false);
 useEffect(()=>{loadFonts([{family:'Inter',file:'fonts/Inter.ttf',weight:'100 900'},{family:'Inter',file:'fonts/Inter-Italic.ttf',weight:'100 900',style:'italic'}]).then(()=>{setFontsReady(true);continueRender(handle);},cancelRender);},[handle,continueRender,cancelRender]);
 const file=(s:string)=>staticFile(`reels/${reel}/${s}`);
 const output=(t:number)=>Math.round(toOut(t,data.segments)*30);
 const ranges=[{start:3.3,end:7,name:'platforms'},{start:14.8,end:18.5,name:'episodes'},{start:18.5,end:22.1,name:'month'},{start:22.1,end:26.2,name:'two'},{start:26.2,end:29.4,name:'cycle'}];
 const posterStart=output(9.5),posterEnd=output(12.6);
 // One continuous, global position curve also spans caption-group boundaries.
 // All points remain below the measured face envelope, even during the move.
 const captionPixels=interpolate(frame,[0,90,102,posterStart,posterStart+12,posterEnd,posterEnd+12,879,894],[1340,1340,1300,1300,1370,1370,1300,1300,1410],{...clamp,easing:Easing.bezier(.4,0,.2,1)});
 const clips=useMemo(()=>captionClips(data),[data]);
 useEffect(()=>{
  if(!review||!fontsReady)return;
  const pending=delayRender('Pomiar odstępu od twarzy');
  let released=false;
  const release=()=>{if(!released){released=true;continueRender(pending);}};
  const animation=requestAnimationFrame(()=>{
   const bounds:DOMRect[]=[];
   for(const root of document.querySelectorAll('[data-netflix-caption]')){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node:Node|null;
    while((node=walker.nextNode()))if(node.textContent?.trim()){
     const range=document.createRange();range.selectNodeContents(node);const rect=range.getBoundingClientRect();if(rect.width&&rect.height)bounds.push(rect);
    }
   }
   const top=bounds.length?Math.min(...bounds.map(r=>r.top)):null;
   const bottom=bounds.length?Math.max(...bounds.map(r=>r.bottom)):null;
   const face=frame>=posterStart&&frame<posterEnd?0:Math.max(0,...review.faceSamples.filter(s=>Math.abs(s.time-frame/30)<.27).map(s=>s.bottom*1920));
   console.log('NETFLIX_GEOMETRY '+JSON.stringify({frame,captionY:captionPixels,captionTop:top,captionBottom:bottom,faceBottom:face,clearance:top===null?null:top-face}));
   release();
  });
  return()=>{cancelAnimationFrame(animation);release();};
 },[frame,review,fontsReady,delayRender,continueRender,captionPixels,posterStart,posterEnd]);
 return <AbsoluteFill style={{background:'#FFFFFF',fontFamily:'Inter'}}>
  {data.segments.map((s,i)=><Sequence key={i} from={output(s.start)} durationInFrames={output(s.end)-output(s.start)}><Camera reel={reel} data={data} start={s.start} viewportHeight={1920}/></Sequence>)}
  <Sequence from={posterStart} durationInFrames={posterEnd-posterStart} layout="none"><NetflixPoster reel={reel} duration={posterEnd-posterStart}/></Sequence>
  {ranges.map(r=><Sequence key={r.start} from={output(r.start)} durationInFrames={output(r.end)-output(r.start)} layout="none"><NetflixViz name={r.name} reel={reel} duration={output(r.end)-output(r.start)}/></Sequence>)}
  {data.overlays?.filter(o=>o.type==='title').map((o,i)=><Sequence key={i} from={output(o.start)} durationInFrames={output(o.end)-output(o.start)} layout="none"><BisanzOverlay o={{...o,y:.772,size:55}} dur={output(o.end)-output(o.start)} src={file} at={t=>toOut(t,data.segments)-toOut(o.start,data.segments)}/></Sequence>)}
  {clips.map(c=><Sequence key={c.index} from={c.from} durationInFrames={c.durationInFrames} layout="none"><AbsoluteFill data-netflix-caption style={{transform:'scale(.78)',transformOrigin:`50% ${captionPixels}px`}}><Bisanz group={{...c.g,y:captionPixels/1920}} words={c.words.map(w=>({...w,at:toOut(w.start,data.segments)-c.start,key:w===c.g.words[c.g.key??0],hl:c.g.hl?.includes(c.g.words.indexOf(w))??false}))} durationInFrames={c.durationInFrames} raised={false}/></AbsoluteFill></Sequence>)}
  {ranges.map((r,i)=><Sequence key={`s${i}`} from={output(r.start)} durationInFrames={25} layout="none"><Audio src={file(i%2?'click.wav':'pop.wav')} volume={.12}/></Sequence>)}
 </AbsoluteFill>;
};
export const SubyReel:React.FC<Props>=props=>props.kind==='netflix'?<NetflixReel {...props}/>:<LegacySubyReel {...props}/>;
export const SubyComposition:React.FC=()=> <Composition id="SubyReel" component={SubyReel} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{reel:'',data:{source:'source.mp4',style:'bisanz',segments:[],captions:[]},kind:'netflix'}} calculateMetadata={({props})=>({durationInFrames:reelFrames(props.data),props})}/>;
