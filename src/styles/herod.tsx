import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { StyleProps } from "../Reel";
import type { Overlay } from "../overlays";

const C = { cream: "#FAF4EF", ink: "#271338", plum: "#55255F", gold: "#D7A160" };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const joiners = new Set("a i w z o u na do od po za ze we ale bo że oraz lub przy przez poprzez pod nad nie dla żeby przede mimo".split(" "));
const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}]/gu, "");

// Jeden zestaw ikon o wspólnej grubości linii.
const Icon: React.FC<{name: string; size?: number; color?: string}> = ({ name, size=76, color=C.plum }) => {
  const paths: Record<string, React.ReactNode> = {
    eye: <><path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3"/></>,
    brain: <><path d="M12 4c-2-3-6-1-6 2-4 0-5 5-2 7-2 3 0 7 4 6 0 3 4 3 4 0V4Zm0 0c2-3 6-1 6 2 4 0 5 5 2 7 2 3 0 7-4 6 0 3-4 3-4 0"/><path d="m6 8 2 2-2 3m12-5-2 2 2 3M8 16l4-2 4 2"/></>,
    layers: <><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/></>,
    journal: <><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M8 3v18m4-13h4m-4 4h4m-4 4h3M3 7h4m-4 5h4m-4 5h4"/></>,
    heart: <path d="M12 21 3 12C-3 5 7-2 12 6c5-8 15-1 9 6l-9 9Z"/>,
    leaf: <><path d="M20 3C8 1 2 8 6 16c8 5 15-1 14-13Z"/><path d="M3 21 16 8m-6 6v-4m0 4h5"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
    link: <><path d="m10 14 4-4m-6 5-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m4 1 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{paths[name] ?? paths.check}</svg>;
};

export const Herod: React.FC<StyleProps> = ({ group, words, durationInFrames: dur, raised }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const atoms: typeof words[] = [];
  for (let i = 0; i < words.length; i++) {
    const atom = [words[i]];
    while (joiners.has(bare(atom[atom.length - 1].text)) && i + 1 < words.length) atom.push(words[++i]);
    atoms.push(atom);
  }
  // Jawny podział redakcyjny ma pierwszeństwo; reszta dzieli się równo między atomami.
  let cut = 1;
  if (group.lineBreak != null) {
    let n=0;
    cut=atoms.findIndex(a => {n+=a.length; return n>=group.lineBreak!;})+1;
  } else {
    const length=(a:typeof atoms)=>a.flat().map(w=>w.text).join(" ").length;
    let best=Infinity;
    for(let i=1;i<atoms.length;i++) {
      const cost=Math.abs(length(atoms.slice(0,i))-length(atoms.slice(i)));
      if(cost<best){best=cost;cut=i;}
    }
  }
  const lines=atoms.length>1?[atoms.slice(0,cut),atoms.slice(cut)]:[atoms];
  const enter=interpolate(f,[0,Math.min(fps*.35,dur/3)],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  const exit=interpolate(f,[dur-Math.min(7,dur/4),dur],[1,0],clamp);
  return <AbsoluteFill style={{pointerEvents:"none"}}>
    <div style={{position:"absolute",top:height*(raised?.63:.73),left:"47%",width:900,
      transform:`translate(-50%, ${raised?"-100%":"-50%"}) translateY(${16*(1-enter)}px)`,opacity:Math.min(enter,exit),
      display:"flex",flexDirection:"column",gap:12,textAlign:"center",lineHeight:1.17,
      textShadow:"0 3px 14px rgba(39,19,56,.85), 0 1px 4px rgba(39,19,56,.95)"}}>
      {lines.map((line,i)=><div key={i} style={{display:"flex",justifyContent:"center",alignItems:"baseline",gap:16,whiteSpace:"nowrap"}}>
        {line.map(atom=>{
          const start=atom[atom.length-1].at*fps;
          const count=line.flat().map(w=>w.text).join(" ").length;
          const scale=Math.min(1,29/Math.max(1,count));
          return <span key={atom[0].start} style={{opacity:interpolate(f-start,[0,4],[0,1],clamp)}}>
            {atom.map((w,j)=><span key={w.start} style={{fontFamily:w.key?'"Libre Baskerville"':"Montserrat",fontWeight:400,fontSize:(w.key?84:60)*scale,color:C.cream}}>
              {j>0?"\u00a0":""}{w.text.replace(/[.,;:]+$/u,"")}
            </span>)}
          </span>;
        })}
      </div>)}
    </div>
  </AbsoluteFill>;
};

type OverlayProps = { o: Overlay; dur: number; src: (file: string) => string; at: (time: number) => number };
export const HerodOverlay: React.FC<OverlayProps> = ({ o, dur, src, at }) => {
  const f=useCurrentFrame();
  const {fps,height}=useVideoConfig();
  const enter=interpolate(f,[0,fps*.6],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  const exit=interpolate(f,[dur-12,dur],[1,0],clamp);
  const opacity=Math.min(enter,exit);
  if(o.type==="media"&&o.fit==="full"&&o.src)return <AbsoluteFill style={{opacity}}>
    <OffthreadVideo src={src(o.src)} trimBefore={Math.round((o.trim??0)*fps)} volume={0} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${1.03-.03*enter})`}}/>
    <AbsoluteFill style={{background:"linear-gradient(180deg, transparent 48%, rgba(39,19,56,.5) 82%)"}}/>
  </AbsoluteFill>;
  if(o.type==="ring") {
    const phase=((f/fps)%2.2)/2.2;
    const x=70+626*(1-Math.abs(2*phase-1));
    return <div style={{position:"absolute",left:"47%",top:height*.63+32,width:860,padding:"40px",boxSizing:"border-box",borderRadius:32,background:C.cream,boxShadow:"0 12px 40px rgba(39,19,56,.2)",opacity,transform:`translateX(-50%) translateY(${16*(1-enter)}px)`}}>
      <svg width="100%" height="100" viewBox="0 0 780 100" fill="none">
        <path d="M50 50h646" stroke={C.gold} strokeWidth="2" strokeDasharray="5 12" opacity=".45"/>
        <path d="M720 10v80" stroke={C.gold} strokeWidth="6" strokeLinecap="round"/>
        <circle cx={x} cy="50" r="24" fill={C.plum}/>
        <circle cx={x-6} cy="43" r="5" fill={C.cream} opacity=".4"/>
      </svg>
    </div>;
  }
  if(o.type==="emoji")return <div style={{position:"absolute",left:"47%",top:(o.y??.64)*height,transform:`translate(-50%, -50%) scale(${.96+.04*enter})`,opacity,
    width:112,height:112,borderRadius:32,background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 25px rgba(39,19,56,.2)"}}><Icon name={o.emoji??"eye"} size={76}/></div>;
  const tile:React.CSSProperties={background:C.cream,borderRadius:32,boxSizing:"border-box",boxShadow:"0 12px 40px rgba(39,19,56,.22)"};
  if(o.type==="media"&&o.src)return <AbsoluteFill>
    <Audio src={src("click-soft.mp3")} volume={.5}/>
    <div style={{...tile,position:"absolute",top:270,left:"47%",transform:"translateX(-50%)",opacity,padding:"22px 38px",display:"flex",alignItems:"center",gap:18,color:C.plum,fontFamily:"Montserrat",fontSize:40}}>
      <Icon name="link" size={38}/>magdalenaherod.pl
    </div>
    <div style={{position:"absolute",top:height*.63+32,left:"47%",width:900,display:"flex",gap:32,alignItems:"center",opacity,transform:`translateX(-50%) translateY(${24*(1-enter)}px)`}}>
      <div style={{width:270,height:420,position:"relative",overflow:"hidden",borderRadius:12,flexShrink:0,boxShadow:"0 16px 36px rgba(39,19,56,.25)"}}>
        <Img src={src(o.src)} style={{position:"absolute",width:512,height:512,maxWidth:"none",left:-130,top:-49}}/>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
        <div style={{...tile,padding:"30px 38px",color:C.plum}}>
          <div style={{fontFamily:"Montserrat",fontSize:30,marginBottom:12}}>Ebook</div>
          <div style={{fontFamily:'"Libre Baskerville"',fontWeight:400,fontSize:58,lineHeight:1.2}}>Zobacz siebie</div>
        </div>
        <div style={{...tile,background:C.plum,color:C.cream,padding:"28px 38px",fontFamily:"Montserrat",fontWeight:400,lineHeight:1.3}}>
          <div style={{fontSize:33}}>Do kupienia<br/>na mojej stronie</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginTop:16,color:C.gold,fontSize:32}}><Icon name="link" size={30} color={C.gold}/>Link w bio</div>
        </div>
      </div>
    </div>
  </AbsoluteFill>;
  return <AbsoluteFill>
    <div style={{...tile,position:"absolute",left:"47%",top:height*.63+32,width:860,padding:"44px 56px",opacity,transform:`translateX(-50%) translateY(${22*(1-enter)}px)`}}>
      <div style={{display:"flex",flexDirection:"column",gap:22}}>
        {(o.items??[]).map((item,i)=>{
          const text=typeof item==="string"?item:item.text;
          const onset=typeof item==="string"?i*.7:at(item.at??o.start);
          const p=interpolate(f-onset*fps,[0,12],[0,1],clamp);
          return <div key={text} style={{opacity:p,display:"flex",alignItems:"center",gap:24,lineHeight:1.2,color:C.ink,fontFamily:"Montserrat",fontWeight:400,fontSize:38}}>
            <Icon name={["leaf","eye","journal","heart"][i%4]} size={44}/>{text}
          </div>;
        })}
      </div>
    </div>
  </AbsoluteFill>;
};
