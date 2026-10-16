// LongForm L4 — efekty z maską osoby (docs/longform/efekty.md → „Wycięcie osoby”).
// Warstwy w SourceShot (src/Reel.tsx), w tej samej geometrii co ujęcie: tło (oryginał, rozmyty, kolor, B-roll) →
// tekst → wycięta osoba (WebM VP9 z alfą z scripts/longform-mask.mjs). Napisy i grafiki zostają nad nimi.
// Czas efektu liczony w sekundach źródła; wejście 0,35 s, wyjście 0,25 s (wyjście szybsze niż wejście).
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile } from "remotion";
import type { Overlay } from "../overlays";
import { lookFor } from "./effects";

export const MASK_FX = new Set(["cutout", "text-behind", "background-swap", "vertigo"]);
export const isMaskEffect = (o: Overlay) => Boolean(o.lf) && MASK_FX.has(o.type) && Boolean(o.mask || o.noMask);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

// Siła efektu 0→1→0 (a) i postęp 0→1 (k) w czasie źródła t.
export const maskAmount = (o: Overlay, t: number) => ({
  a: ease(Math.min(interpolate(t, [o.start, o.start + 0.35], [0, 1], clamp), interpolate(t, [o.end - 0.25, o.end], [1, 0], clamp))),
  k: ease(interpolate(t, [o.start, o.end], [0, 1], clamp)),
});

// Skale (tło, osoba) względem kamery ujęcia. Vertigo: osoba rośnie, tło odjeżdża; tło ≤ osoba,
// więc oryginalna sylwetka w tle zawsze chowa się pod wyciętą osobą. Bez maski: wolny najazd.
export const maskScales = (o: Overlay | undefined, t: number) => {
  if (!o) return { bg: 1, person: 1 };
  const { a, k } = maskAmount(o, t);
  if (o.type === "vertigo") return o.mask ? { bg: 1 + a * (0.1 - 0.1 * k), person: 1 + a * (0.1 + 0.15 * k) } : { bg: 1 + a * 0.12 * k, person: 1 };
  if (o.mask && blurred(o)) return { bg: 1 + 0.05 * a, person: 1 }; // rozmycie bez ciemnych brzegów kadru
  return { bg: 1, person: 1 };
};

const blurred = (o: Overlay) => o.type === "cutout" || (o.type === "background-swap" && o.bg === "blur");

// Filtr oryginału jako tła (rozmycie dla cutout / blur).
// text-behind: tło przyciemnione, żeby jasne litery były czytelne także na jasnej ścianie.
export const maskBgFilter = (o: Overlay | undefined, t: number) => {
  if (!o?.mask) return undefined;
  const { a } = maskAmount(o, t);
  if (o.type === "text-behind") return `brightness(${1 - 0.35 * a})`;
  if (!blurred(o)) return undefined;
  return `blur(${18 * a}px) brightness(${1 - 0.4 * a}) saturate(${1 - 0.25 * a})`;
};

const withAlpha = (hex: string, a: number) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}` : hex);

// Wideo zaczynające się w czasie źródła `at`, w ujęciu zaczynającym się w `shotStart`.
const FromSource: React.FC<{ at: number; shotStart: number; fps: number; src: string; style: CSSProperties; transparent?: boolean }> = ({ at, shotStart, fps, src, style, transparent }) => {
  const from = Math.max(0, Math.round((at - shotStart) * fps));
  const trim = Math.max(0, Math.round((shotStart - at) * fps));
  return (
    <Sequence from={from} layout="none" showInTimeline={false}>
      <OffthreadVideo src={src} trimBefore={trim || undefined} muted transparent={transparent} toneMapped={false} style={style} />
    </Sequence>
  );
};

export const MaskLayers: React.FC<{ o: Overlay; t: number; reel: string; shotStart: number; fps: number; videoStyle: CSSProperties; personScale: number; styleId?: string }> = ({
  o,
  t,
  reel,
  shotStart,
  fps,
  videoStyle,
  personScale,
  styleId,
}) => {
  const look = lookFor(styleId ?? "persona");
  const { a } = maskAmount(o, t);
  const file = (f: string) => staticFile(`reels/${reel}/${f}`);
  const vignette = o.type === "vertigo" && (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)", opacity: a }} />
  );
  if (!o.mask) return vignette || null;
  const words = String(o.text ?? "").split(/\s+/).filter(Boolean);
  const chars = Math.max(4, words.join(" ").length);
  const person: CSSProperties = {
    ...videoStyle,
    position: "absolute",
    inset: 0,
    transform: `${videoStyle.transform ?? ""} scale(${personScale})`,
    filter:
      o.type === "cutout"
        ? `drop-shadow(0 0 3px ${withAlpha(look.accent, a)}) drop-shadow(0 0 1px ${withAlpha(look.accent, a)}) drop-shadow(0 24px 40px rgba(0,0,0,${0.45 * a}))`
        : undefined,
  };
  return (
    <AbsoluteFill>
      {o.type === "background-swap" && o.bg === "color" && (
        <AbsoluteFill style={{ opacity: a, background: `radial-gradient(circle at 50% 30%, ${withAlpha(look.accent, 0.55)} 0%, transparent 60%), #15100C` }} />
      )}
      {o.type === "background-swap" && o.bg === "broll" && o.src && (
        <AbsoluteFill style={{ opacity: a }}>
          <FromSource at={o.start} shotStart={shotStart} fps={fps} src={file(o.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}
      {vignette}
      {o.type === "text-behind" && words.length > 0 && (
        <AbsoluteFill style={{ alignItems: "center" }}>
          <div
            style={{
              marginTop: "5%",
              fontFamily: look.keyFont,
              fontWeight: look.weight,
              // jedno-dwa słowa na prawie całą szerokość; głowa zasłania tylko część liter
              fontSize: `min(${90 / (chars * 0.62)}vw, 30vh)`,
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              color: look.text,
              opacity: a,
              transform: `translateY(${(1 - a) * 8}%) scale(${0.94 + 0.06 * a})`,
              textShadow: "0 10px 40px rgba(0,0,0,0.35)",
            }}
          >
            {words.map((w, i) => (
              <span key={i} style={{ color: o.hl && o.hl.includes(w) ? look.accent : undefined }}>
                {i ? " " : ""}
                {w}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      )}
      <FromSource at={o.mask.from} shotStart={shotStart} fps={fps} src={file(o.mask.src)} style={person} transparent />
    </AbsoluteFill>
  );
};
