// LongForm L3 — efekty „Fundament” (docs/longform/efekty.md) na tokenach motywu klienta.
// Kadr poziomy: tekst w lewej kolumnie (twarz w środku, karty po prawej); pion: środek pod twarzą.
// Ruch: sprężyste wejście ze sprężyną, wyjście szybsze niż wejście (frame.md, OneTake).
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Overlay } from "../overlays";
import { T as PERSONA } from "../styles/persona";
import { BISANZ, type Theme } from "../styles/bisanz";
import { AMERYKA } from "../styles/ameryka";
import { GLOWUP } from "../styles/glowup";
import { VITAL } from "../styles/vital";
import { HAPPYNEWS } from "../styles/happynews";

// cutout, text-behind, background-swap, vertigo: warstwy w SourceShot (src/longform/mask.tsx), tu bez rysowania
export const LF_EFFECTS = new Set(["typography", "chapter-card", "logo", "zoom-through", "cutout", "text-behind", "background-swap", "vertigo"]);
export const isLongFormEffect = (o: Overlay) => Boolean(o.lf) && LF_EFFECTS.has(o.type);

type Look = { font: string; keyFont: string; weight: number; accent: string; onAccent: string; text: string; card: string; cardText: string; radius: number; label: string };
const KINETIC: Record<string, Theme> = { bisanz: BISANZ, ameryka: AMERYKA, glowup: GLOWUP, vital: VITAL, happynews: HAPPYNEWS };
// Styl bez motywu silnika Bisanza (persona, herod, skyclass…) bierze język wizualny frame.md (tokeny persony).
export const lookFor = (style: string): Look => {
  const t = KINETIC[style];
  if (t)
    return { font: t.font, keyFont: t.keyFont ?? t.font, weight: t.keyWeight, accent: t.accent, onAccent: t.onAccent, text: t.text, card: t.card, cardText: t.cardText, radius: t.radius, label: t.label.font };
  return { font: PERSONA.font, keyFont: PERSONA.font, weight: 900, accent: PERSONA.accent, onAccent: "#1A0F08", text: "#FFF6EE", card: "rgba(20,14,10,0.72)", cardText: "#FFF6EE", radius: 40, label: PERSONA.font };
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const useMotion = (dur: number) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 16, stiffness: 150, mass: 0.8 } });
  const exitLen = Math.max(1, Math.min(Math.round(0.25 * fps), Math.floor(dur / 3)));
  const exit = interpolate(f, [dur - exitLen, dur], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return { f, fps, width, height, enter, exit, wide: width > height };
};

const Typography: React.FC<{ o: Overlay; dur: number; look: Look }> = ({ o, dur, look }) => {
  const { width, height, enter, exit, wide } = useMotion(dur);
  const hook = o.role === "hook";
  const size = (wide ? height : width) * (hook ? 0.07 : 0.055);
  const words = String(o.text ?? "").split(/\s+/);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          // kolumna kończy się przed twarzą także przy punch-in 1,2–1,3
          left: wide ? width * 0.045 : width * 0.08,
          width: wide ? width * 0.28 : width * 0.84,
          top: wide ? height * 0.5 : height * 0.66,
          transform: `translateY(-50%) translateX(${(1 - enter) * -40 - exit * 30}px)`,
          opacity: Math.min(enter, 1 - exit),
          fontFamily: look.keyFont,
          fontWeight: look.weight,
          fontSize: size,
          lineHeight: 1.05,
          color: look.text,
          textAlign: wide ? "left" : "center",
          textShadow: "0 6px 24px rgba(0,0,0,0.45)",
          textWrap: "balance",
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ display: "inline-block", marginRight: "0.25em", color: o.hl && o.hl.includes(w) ? look.accent : undefined, transform: `translateY(${Math.max(0, 1 - enter * 1.4 + i * 0.12) * 30}px)` }}>
            {w}
          </span>
        ))}
        <div style={{ height: size * 0.12, width: `${enter * 40}%`, background: look.accent, borderRadius: 99, marginTop: size * 0.25 }} />
      </div>
    </AbsoluteFill>
  );
};

const ChapterCard: React.FC<{ o: Overlay; dur: number; look: Look }> = ({ o, dur, look }) => {
  const { width, height, enter, exit, wide } = useMotion(dur);
  const base = wide ? height : width;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: wide ? width * 0.045 : width * 0.08,
          top: wide ? height * 0.12 : height * 0.18,
          maxWidth: wide ? width * 0.3 : width * 0.84,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: base * 0.025,
          padding: `${base * 0.02}px ${base * 0.035}px ${base * 0.02}px ${base * 0.02}px`,
          background: look.card,
          color: look.cardText,
          borderRadius: look.radius,
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          transform: `translateX(${(1 - enter) * -60}px) scale(${0.96 + 0.04 * enter})`,
          opacity: Math.min(enter, 1 - exit),
          fontFamily: look.font,
        }}
      >
        <div style={{ display: "grid", placeItems: "center", width: base * 0.075, height: base * 0.075, borderRadius: look.radius * 0.6, background: look.accent, color: look.onAccent, fontWeight: 900, fontSize: base * 0.04 }}>
          {String(o.n ?? "").padStart(2, "0")}
        </div>
        <div style={{ fontWeight: look.weight, fontSize: base * 0.04, lineHeight: 1.05 }}>{o.title}</div>
      </div>
    </AbsoluteFill>
  );
};

const Logo: React.FC<{ o: Overlay; dur: number; look: Look; src: (f: string) => string }> = ({ o, dur, look, src }) => {
  const { width, height, enter, exit, wide } = useMotion(dur);
  const box = (wide ? height : width) * 0.16;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: wide ? width * 0.75 : width * 0.5,
          top: wide ? height * 0.3 : height * 0.68,
          transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * enter}) translateY(${exit * 20}px)`,
          opacity: Math.min(enter, 1 - exit),
          padding: box * 0.18,
          background: look.card,
          borderRadius: look.radius,
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        }}
      >
        {o.src && <Img src={src(o.src)} style={{ display: "block", height: box, maxWidth: box * 3, objectFit: "contain" }} />}
      </div>
    </AbsoluteFill>
  );
};

// Podpis źródła danych (wykres/licznik z researchu): zawsze widoczny, mały, w rogu title-safe.
export const SourceTag: React.FC<{ o: Overlay; dur: number; style: string }> = ({ o, dur, style }) => {
  const look = lookFor(style);
  const { width, height, enter, exit } = useMotion(dur);
  if (!o.source) return null;
  let host = o.source;
  try {
    host = new URL(o.source).hostname.replace(/^www\./, "");
  } catch {
    /* zwykły tekst źródła */
  }
  return (
    <div style={{ position: "absolute", right: width * 0.05, bottom: height * 0.06, fontFamily: look.label, fontSize: Math.min(width, height) * 0.02, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 8px rgba(0,0,0,0.6)", opacity: Math.min(enter, 1 - exit) }}>
      Źródło: {host}
    </div>
  );
};

export const LongFormEffect: React.FC<{ o: Overlay; dur: number; src: (f: string) => string; style: string }> = ({ o, dur, src, style }) => {
  const look = lookFor(style);
  if (o.type === "typography") return <Typography o={o} dur={dur} look={look} />;
  if (o.type === "chapter-card") return <ChapterCard o={o} dur={dur} look={look} />;
  if (o.type === "logo") return <Logo o={o} dur={dur} look={look} src={src} />;
  return null; // zoom-through: ruch kamery w SourceShot (src/Reel.tsx)
};
