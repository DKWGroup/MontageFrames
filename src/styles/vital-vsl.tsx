import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { OverlayProps } from "./bisanz";

// Vital Hormone — VSL poziomy (1920×1080) na vital-hormone.pl/lp/. Panel zakrywa połowę kadru z osobą,
// która nie mówi; hasła, przebitki i plansza końcowa na pełnym kadrze. Zasady: klienci/vital-hormone/PREFERENCJE.md
// (sekcja „VSL na landing page”). Ruch: jedna krzywa (0.2, 0, 0, 1), wejście 0,5 s, wyjście 8 klatek.
// Paleta VSL. Domyślnie Vital Hormone; inny klient podmienia ją przez `setVslPalette` (np. styl `oskar`).
// ponytail: paleta modułowa, ustawiana w VslOverlay przed renderem dzieci — jedna kompozycja = jeden styl;
// gdyby dwa style VSL renderowały się w jednym drzewie, przejść na React context.
export type VslPalette = {
  bg: string; bg2: string; paper: string; ink: string; accent: string; muted: string;
  line: string; head: string; body: string; disclaimer: string;
  bgRgb: string; accentRgb: string; inkRgb: string;
};
export const VITAL_VSL: VslPalette = {
  bg: "#230C4A",
  bg2: "#2C1651",
  paper: "#F8F9FA",
  ink: "#1A1C1D",
  accent: "#D9F99D",
  muted: "#B9B3C9",
  line: "rgba(217,249,157,0.18)",
  head: "Montserrat, sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
  disclaimer: "Efekty są indywidualne i zależą m.in. od diety, treningu i stylu życia.",
  bgRgb: "35,12,74",
  accentRgb: "217,249,157",
  inkRgb: "26,28,29",
};
let VIOLET = "", VIOLET2 = "", PAPER = "", INK = "", LIME = "", MUTED = "", LINE = "";
let MONT = "", JAKARTA = "", DISCLAIMER = "", BG_RGB = "", ACC_RGB = "", INK_RGB = "";
export const setVslPalette = (p: VslPalette) => {
  ({ bg: VIOLET, bg2: VIOLET2, paper: PAPER, ink: INK, accent: LIME, muted: MUTED, line: LINE,
    head: MONT, body: JAKARTA, disclaimer: DISCLAIMER, bgRgb: BG_RGB, accentRgb: ACC_RGB, inkRgb: INK_RGB } = p);
};
setVslPalette(VITAL_VSL);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CURVE = Easing.bezier(0.2, 0, 0, 1);
const ez = (f: number, fps: number, t: number, len = 0.5) =>
  interpolate(f, [t * fps, (t + len) * fps], [0, 1], {
    ...clamp,
    easing: CURVE,
  });
const sp = (f: number, fps: number, t: number) =>
  spring({
    frame: f - Math.round(t * fps),
    fps,
    config: { damping: 15, stiffness: 140 },
  });
const isVideo = (s: string) => /\.(mp4|mov|webm)$/i.test(s);
type It = {
  text: string;
  at?: number;
  sub?: string;
  icon?: string;
  src?: string;
};
const items = (o: OverlayProps["o"]): It[] =>
  (o.items ?? []).map((it) => (typeof it === "string" ? { text: it } : it));
// indeks ostatniego elementu, którego czas już minął (-1 = żaden)
const lastAt = (times: number[], t: number) =>
  times.filter((x) => t >= x).length - 1;
const tOf = (it: It, i: number, at: OverlayProps["at"], step = 0.35) =>
  it.at != null ? at(it.at) : 0.35 + i * step;

// ——— Ikony (proste kształty w siatce 24×24) ———
const ICON: Record<string, string> = {
  bolt: "M13 2 4 14h7l-1 8 9-13h-7z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  heart:
    "M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2 0 3.6 1.1 4.4 2.6L12 9.2l1-1.6C13.8 6.1 15.4 5 17.4 5c3.4 0 5.6 3.3 4.1 6.8C19.5 16.4 12 21 12 21z",
  leaf: "M4 21c0-9.5 6.5-16 17-17-1 10.5-7.5 17-17 17zm0 0 9-9",
  dumbbell: "M2 10h3v4H2zm3-3h3v10H5zm11 0h3v10h-3zm3 3h3v4h-3zM8 11h8v2H8z",
  spark: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z",
  flame:
    "M12 2c1.2 4 5.5 6.2 5.5 11.5a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4.3 2.3-5.5 0 2 .9 3.3 2.2 3.3 0-3.4-.2-6.4 1-9.3z",
  plus: "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
  drop: "M12 2s7 7.6 7 12.5a7 7 0 0 1-14 0C5 9.6 12 2 12 2z",
  focus:
    "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  chart: "M3 20h18v-2H3zm2-4 4.5-5 3.5 3 6-7 1.5 1.3-7.3 8.6-3.5-3L6.5 17.3z",
  up: "M12 4l7 8h-4.5v8h-5v-8H5z",
  down: "M12 20l-7-8h4.5V4h5v8H19z",
  check: "M4 12.5l5 5L20 6.5",
};
const Icon: React.FC<{ name?: string; size: number; color: string }> = ({
  name,
  size,
  color,
}) =>
  name && ICON[name] ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      <path
        d={ICON[name]}
        fill={name === "check" ? "none" : color}
        stroke={name === "check" ? color : "none"}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : null;

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = LIME,
}) => (
  <div
    style={{
      fontFamily: JAKARTA,
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);
const Small: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      fontFamily: JAKARTA,
      fontWeight: 400,
      fontSize: 20,
      lineHeight: 1.35,
      color: MUTED,
      ...style,
    }}
  >
    {children}
  </div>
);
// Tekst z fragmentem `hl` na limonkowym zakreślaczu, który przejeżdża od lewej.
const Marked: React.FC<{ text: string; hl?: string; sweep: number }> = ({
  text,
  hl,
  sweep,
}) => {
  if (!hl || !text.includes(hl)) return <>{text}</>;
  const [a, ...b] = text.split(hl);
  return (
    <>
      {a}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "0 0.16em",
        }}
      >
        {hl}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            padding: "0 0.16em",
            borderRadius: "0.2em",
            background: LIME,
            color: VIOLET,
            textShadow: "none",
            clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)`,
          }}
        >
          {hl}
        </span>
      </span>
      {b.join(hl)}
    </>
  );
};

// ——— Powłoka panelu ———
// Panel kryje osobę, która nie mówi, od pierwszej do ostatniej klatki: wchodzi i schodzi na cięciu kamery,
// a ruch dzieje się w środku (treść dojeżdża ze skali 1,04). `over` = panel wjeżdża na poprzedni panel
// po tej samej stronie: odsłania się od krawędzi przy mówiącym, limonkowa krawędź prowadzi ruch
// (poprzedni panel musi trwać ≥0,5 s dłużej). Pełny kadr: od razu kryjący, najazd z rozmyciem.
const BOX = {
  left: [0.025, 0.06, 0.445, 0.74],
  right: [0.53, 0.06, 0.445, 0.74],
  full: [0, 0, 1, 1],
} as const;

const Shell: React.FC<{
  o: OverlayProps["o"];
  src: OverlayProps["src"];
  bg?: string;
  children: (box: { w: number; h: number }) => React.ReactNode;
}> = ({ o, src, bg = VIOLET, children }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const side = o.side ?? "right";
  const [bx, by, bw, bh] = o.box ?? BOX[side];
  const w = bw * width,
    h = bh * height;
  const e = ez(f, fps, 0, 0.5);
  const full = side === "full";
  const r = full ? 0 : 28;
  const wipe = o.over && !full ? e : 1;
  // lewy panel odsłania się od prawej krawędzi (przy mówiącym), prawy od lewej
  const clip =
    wipe >= 1
      ? full
        ? undefined
        : `inset(0 round ${r}px)`
      : side === "left"
        ? `inset(0 0 0 ${(1 - wipe) * 100}% round ${r}px)`
        : `inset(0 ${(1 - wipe) * 100}% 0 0 round ${r}px)`;
  const edge = side === "left" ? (1 - wipe) * w : wipe * w;
  return (
    <div
      style={{
        position: "absolute",
        left: bx * width,
        top: by * height,
        width: w,
        height: h,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.4} />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: r,
          overflow: "hidden",
          background: bg,
          clipPath: clip,
          boxShadow: full ? undefined : `0 30px 80px rgba(${INK_RGB},0.45)`,
          outline: full ? undefined : `1px solid ${LINE}`,
          outlineOffset: -1,
          color: PAPER,
          fontFamily: JAKARTA,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${1.04 - 0.04 * e})`,
            filter: full && e < 0.98 ? `blur(${(1 - e) * 14}px)` : undefined,
          }}
        >
          {children({ w, h })}
        </div>
      </div>
      {wipe > 0.01 && wipe < 0.99 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: edge - 3,
            width: 6,
            borderRadius: 3,
            background: LIME,
            boxShadow: `0 0 24px rgba(${ACC_RGB},0.7)`,
          }}
        />
      )}
    </div>
  );
};

// Wewnętrzny układ karty: nagłówek u góry, treść, stopka (źródło/dopisek) na dole.
const Layout: React.FC<{
  pad?: number;
  head?: React.ReactNode;
  foot?: React.ReactNode;
  children: React.ReactNode;
  center?: boolean;
}> = ({ pad = 44, head, foot, children, center }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      padding: pad,
      display: "flex",
      flexDirection: "column",
      gap: 22,
    }}
  >
    {head}
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: center ? "center" : "flex-start",
        gap: 16,
      }}
    >
      {children}
    </div>
    {foot}
  </div>
);

// Ambient: miękka limonkowa poświata, która powoli oddycha w rogu karty.
const Glow: React.FC<{ f: number; x?: string; y?: string }> = ({
  f,
  x = "85%",
  y = "10%",
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(circle at ${x} ${y}, rgba(${ACC_RGB},${0.1 + 0.04 * Math.sin(f / 22)}) 0%, transparent 55%)`,
    }}
  />
);

const Media: React.FC<{
  file: string;
  src: OverlayProps["src"];
  trim?: number;
  f: number;
  dur: number;
}> = ({ file, src, trim, f, dur }) => {
  const { fps } = useVideoConfig();
  const css: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${interpolate(f, [0, Math.max(1, dur)], [1.12, 1.0], clamp)})`,
  };
  return isVideo(file) ? (
    <OffthreadVideo
      src={src(file)}
      trimBefore={Math.round((trim ?? 0) * fps)}
      muted
      toneMapped={false}
      style={css}
    />
  ) : (
    <Img src={src(file)} style={css} />
  );
};

const Tag: React.FC<{ text: string; p: number; light?: boolean }> = ({
  text,
  p,
  light,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 22px",
      borderRadius: 100,
      background: light ? LIME : `rgba(${BG_RGB},0.88)`,
      color: light ? VIOLET : PAPER,
      fontFamily: JAKARTA,
      fontWeight: 700,
      fontSize: 26,
      opacity: p,
      transform: `translateY(${(1 - p) * 20}px)`,
      boxShadow: `0 10px 30px rgba(${INK_RGB},0.35)`,
    }}
  >
    {!light && (
      <span
        style={{ width: 12, height: 12, borderRadius: 6, background: LIME }}
      />
    )}
    {text}
  </div>
);

// `media`: przebitka w panelu; `items[{src, at, text}]` = szybkie cięcia w rytmie słów, każde z najazdem.
const PanelMedia: React.FC<OverlayProps> = ({ o, dur, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clips = o.src
    ? [{ src: o.src, text: o.text, t: 0 }]
    : items(o).map((it, i) => ({
        src: it.src!,
        text: it.text,
        t: i ? tOf(it, i, at) : 0,
      }));
  const t = f / fps;
  const idx = Math.max(
    0,
    lastAt(
      clips.map((c) => c.t),
      t,
    ),
  );
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          {clips.map((c, i) => {
            if (i < idx - 1 || i > idx) return null;
            const from = Math.round(c.t * fps);
            const next = clips[i + 1] ? Math.round(clips[i + 1].t * fps) : dur;
            const p = i ? ez(f, fps, c.t, 0.35) : 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  // następne ujęcie wjeżdża z boku z rozmyciem, poprzednie zostaje pod nim
                  clipPath: i ? `inset(0 0 0 ${(1 - p) * 100}%)` : undefined,
                  filter: i && p < 0.98 ? `blur(${(1 - p) * 10}px)` : undefined,
                }}
              >
                <Media
                  file={c.src}
                  src={src}
                  trim={i === 0 ? o.trim : 0}
                  f={f - from}
                  dur={next - from}
                />
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                `linear-gradient(180deg, rgba(${BG_RGB},0.15) 0%, transparent 35%, rgba(${BG_RGB},0.65) 100%)`,
            }}
          />
          {clips[idx]?.text && (
            <div style={{ position: "absolute", left: 32, bottom: 32 }}>
              <Tag
                key={idx}
                text={clips[idx].text!}
                p={ez(f, fps, clips[idx].t + 0.2, 0.4)}
              />
            </div>
          )}
        </>
      )}
    </Shell>
  );
};

// `wall`: siatka przemian, kafle wchodzą kaskadą i powoli dryfują w górę (ambient).
const Wall: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgs = o.images ?? [];
  const cols = 3;
  return (
    <Shell o={o} src={src}>
      {({ w }) => {
        const gap = 12;
        const tw = (w - 2 * 32 - gap * (cols - 1)) / cols;
        const th = tw * 0.6;
        const drift = interpolate(f, [0, dur], [0, -(th + gap) * 0.9], clamp);
        return (
          <>
            <div
              style={{
                position: "absolute",
                left: 32,
                right: 32,
                top: 150,
                bottom: 70,
                overflow: "hidden",
                maskImage:
                  "linear-gradient(180deg, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, ${tw}px)`,
                  gap,
                  transform: `translateY(${drift + 20}px)`,
                }}
              >
                {imgs.map((im, i) => {
                  const p = sp(f, fps, 0.3 + i * 0.04);
                  return (
                    <Img
                      key={im}
                      src={src(im)}
                      style={{
                        width: tw,
                        height: th,
                        objectFit: "cover",
                        borderRadius: 14,
                        opacity: Math.min(1, p * 1.4),
                        transform: `scale(${0.86 + 0.14 * p})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div style={{ position: "absolute", left: 40, top: 40, right: 40 }}>
              <Eyebrow>{o.title ?? "Metamorfozy podopiecznych"}</Eyebrow>
              <div
                style={{
                  fontFamily: MONT,
                  fontWeight: 800,
                  fontSize: 46,
                  letterSpacing: "-0.02em",
                  marginTop: 10,
                  opacity: ez(f, fps, 0.2),
                }}
              >
                <Marked
                  text={o.text ?? ""}
                  hl={o.hl}
                  sweep={ez(f, fps, 0.5, 0.6)}
                />
              </div>
            </div>
            <Small
              style={{
                position: "absolute",
                left: 40,
                right: 40,
                bottom: 26,
                opacity: ez(f, fps, 0.6),
              }}
            >
              {DISCLAIMER}
            </Small>
          </>
        );
      }}
    </Shell>
  );
};

// Pełny kadr: przemiany w czterech rzędach jadących na przemian w lewo i w prawo, na środku hasło.
const FullWall: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const imgs = o.images ?? [];
  const rows = 4;
  const gap = 14;
  const th = (height - gap * (rows + 1)) / rows;
  const tw = th / 0.6;
  const per = Math.ceil(imgs.length / rows);
  const card = ez(f, fps, 0.25, 0.55);
  return (
    <Shell o={o} src={src} bg={INK}>
      {() => (
        <>
          {Array.from({ length: rows }, (_, r) => {
            const row = imgs.slice(r * per, r * per + per);
            const speed = (r % 2 ? 1 : -1) * 90; // px/s, ponytail: stała prędkość taśmy (marquee), bez easingu
            const off = (r % 2 ? -tw * 1.5 : 0) + (speed * f) / fps;
            return (
              <div
                key={r}
                style={{
                  position: "absolute",
                  top: gap + r * (th + gap),
                  left: 0,
                  display: "flex",
                  gap,
                  transform: `translateX(${off}px)`,
                }}
              >
                {row.map((im, i) => (
                  <Img
                    key={im}
                    src={src(im)}
                    style={{
                      width: tw,
                      height: th,
                      objectFit: "cover",
                      borderRadius: 16,
                      opacity: Math.min(
                        1,
                        sp(f, fps, 0.05 + (i + r) * 0.03) * 1.5,
                      ),
                    }}
                  />
                ))}
              </div>
            );
          })}
          <AbsoluteFill
            style={{
              background:
                `radial-gradient(ellipse at 50% 50%, rgba(${BG_RGB},0.82) 0%, rgba(${BG_RGB},0.55) 45%, rgba(${INK_RGB},0.25) 100%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: height * 0.44,
              transform: `translate(-50%, -50%) translateY(${(1 - card) * 40}px) scale(${0.94 + 0.06 * card})`,
              opacity: card,
              textAlign: "center",
              width: width * 0.7,
            }}
          >
            <Eyebrow>{o.title ?? "Metamorfozy podopiecznych"}</Eyebrow>
            <div
              style={{
                fontFamily: MONT,
                fontWeight: 800,
                fontSize: 104,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                marginTop: 14,
                textShadow: `0 8px 40px rgba(${INK_RGB},0.6)`,
              }}
            >
              <Marked
                text={o.text ?? ""}
                hl={o.hl}
                sweep={ez(f, fps, 0.55, 0.6)}
              />
            </div>
            <Small
              style={{
                marginTop: 22,
                fontSize: 22,
                color: PAPER,
                opacity: 0.8,
              }}
            >
              {DISCLAIMER}
            </Small>
          </div>
        </>
      )}
    </Shell>
  );
};

// `beforeafter`: wyróżnione przemiany jedna po drugiej, plakietki PRZED / PO, limonkowa linia podziału.
const BeforeAfter: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgs = o.images ?? [];
  const slot = dur / fps / Math.max(1, imgs.length);
  const idx = Math.min(imgs.length - 1, Math.floor(f / fps / slot));
  return (
    <Shell o={o} src={src}>
      {({ w }) => {
        const iw = w - 2 * 40;
        const ih = iw * 0.6;
        return (
          <Layout
            pad={40}
            head={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Eyebrow>{o.title ?? "Metamorfozy podopiecznych"}</Eyebrow>
                <div
                  style={{
                    fontFamily: MONT,
                    fontWeight: 800,
                    fontSize: 28,
                    color: MUTED,
                  }}
                >
                  <span style={{ color: LIME }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>{" "}
                  / {String(imgs.length).padStart(2, "0")}
                </div>
              </div>
            }
            foot={<Small>{DISCLAIMER}</Small>}
            center
          >
            <div style={{ position: "relative", width: iw, height: ih }}>
              {imgs.map((im, i) => {
                if (i < idx - 1 || i > idx) return null;
                const p = i ? ez(f, fps, i * slot, 0.45) : ez(f, fps, 0.2, 0.5);
                return (
                  <div
                    key={im}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 20,
                      overflow: "hidden",
                      transform: `translateX(${(1 - p) * 60}%) scale(${0.92 + 0.08 * p})`,
                      opacity: Math.min(1, p * 2),
                      boxShadow: `0 20px 50px rgba(${INK_RGB},0.5)`,
                    }}
                  >
                    <Img
                      src={src(im)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        width: 4,
                        marginLeft: -2,
                        height: `${ez(f, fps, i * slot + 0.3, 0.5) * 100}%`,
                        background: LIME,
                        boxShadow: `0 0 18px rgba(${ACC_RGB},0.8)`,
                      }}
                    />
                    {["Przed", "Po"].map((label, k) => (
                      <div
                        key={label}
                        style={{
                          position: "absolute",
                          top: 18,
                          [k ? "right" : "left"]: 18,
                          padding: "8px 18px",
                          borderRadius: 100,
                          background: k ? LIME : `rgba(${BG_RGB},0.88)`,
                          color: k ? VIOLET : PAPER,
                          fontWeight: 700,
                          fontSize: 22,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          transform: `scale(${sp(f, fps, i * slot + 0.35 + k * 0.15)})`,
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Layout>
        );
      }}
    </Shell>
  );
};

// `stat`: liczba-bohater z badania (odlicza się), opis i źródło.
const Stat: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = interpolate(f, [0.35 * fps, 1.5 * fps], [o.from ?? 0, o.to ?? 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const num = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: o.decimals ?? 0,
    maximumFractionDigits: o.decimals ?? 0,
  }).format(n);
  const p = sp(f, fps, 0.3);
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} x="20%" y="35%" />
          <Layout
            head={<Eyebrow>{o.title}</Eyebrow>}
            foot={o.source && <Small>Źródło: {o.source}</Small>}
            center
          >
            <div
              style={{
                fontFamily: MONT,
                fontWeight: 800,
                fontSize: o.size ?? 190,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: LIME,
                transform: `scale(${0.85 + 0.15 * p})`,
                transformOrigin: "left center",
                opacity: Math.min(1, p * 2),
                textShadow: `0 0 60px rgba(${ACC_RGB},0.25)`,
                whiteSpace: "nowrap",
              }}
            >
              {o.prefix}
              {num}
              {o.suffix}
            </div>
            <div
              style={{
                fontFamily: MONT,
                fontWeight: 700,
                fontSize: 40,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                opacity: ez(f, fps, 0.8),
                transform: `translateY(${(1 - ez(f, fps, 0.8)) * 20}px)`,
              }}
            >
              {o.text}
            </div>
            {o.label && (
              <Small style={{ fontSize: 26, opacity: ez(f, fps, 1.1) }}>
                {o.label}
              </Small>
            )}
          </Layout>
        </>
      )}
    </Shell>
  );
};

// Wiersz z ikoną w limonkowym kółku.
const Row: React.FC<{ it: It; p: number; size?: number }> = ({
  it,
  p,
  size = 40,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "14px 20px",
      borderRadius: 20,
      background: VIOLET2,
      outline: `1px solid ${LINE}`,
      opacity: Math.min(1, p * 1.6),
      transform: `translateX(${(1 - p) * 40}px)`,
      filter: p < 0.95 ? `blur(${(1 - p) * 6}px)` : undefined,
    }}
  >
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 29,
        background: LIME,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        transform: `scale(${0.6 + 0.4 * Math.min(1, p)})`,
      }}
    >
      <Icon name={it.icon ?? "check"} size={30} color={VIOLET} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: MONT,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {it.text}
      </div>
      {it.sub && (
        <div style={{ fontSize: 22, color: MUTED, marginTop: 4 }}>{it.sub}</div>
      )}
    </div>
  </div>
);

// `checklist`: punkty wchodzą, gdy padają; opcjonalna przebitka (`src`) w górnej części karty.
const Checklist: React.FC<OverlayProps> = ({ o, dur, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Shell o={o} src={src}>
      {({ h }) => (
        <>
          {o.src && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: h * 0.42,
                overflow: "hidden",
              }}
            >
              <Media file={o.src} src={src} trim={o.trim} f={f} dur={dur} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, transparent 40%, ${VIOLET} 100%)`,
                }}
              />
            </div>
          )}
          <Glow f={f} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              top: o.src ? h * 0.36 : 0,
            }}
          >
            <Layout
              head={<Eyebrow>{o.title}</Eyebrow>}
              foot={o.source && <Small>Źródło: {o.source}</Small>}
              center
            >
              {items(o).map((it, i) => (
                <Row
                  key={i}
                  it={it}
                  p={sp(f, fps, tOf(it, i, at))}
                  size={o.size}
                />
              ))}
            </Layout>
          </div>
        </>
      )}
    </Shell>
  );
};

// `chips`: pigułki wyskakują przy słowach; ostatnio wypowiedziana na limonce.
const Chips: React.FC<OverlayProps> = ({ o, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items(o);
  const times = list.map((it, i) => tOf(it, i, at));
  const last = lastAt(times, f / fps);
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} x="50%" y="55%" />
          <Layout
            head={<Eyebrow>{o.title}</Eyebrow>}
            foot={o.label && <Small>{o.label}</Small>}
            center
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                justifyContent: "center",
              }}
            >
              {list.map((it, i) => {
                const p = spring({
                  frame: f - Math.round(times[i] * fps),
                  fps,
                  config: { damping: 11, stiffness: 170 },
                });
                const on = i === last;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "18px 30px",
                      borderRadius: 100,
                      background: on ? LIME : VIOLET2,
                      color: on ? VIOLET : PAPER,
                      outline: on ? undefined : `1px solid ${LINE}`,
                      fontFamily: MONT,
                      fontWeight: 800,
                      fontSize: o.size ?? 44,
                      letterSpacing: "-0.02em",
                      opacity: Math.min(1, p * 2),
                      transform: `scale(${0.5 + 0.5 * p}) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)`,
                    }}
                  >
                    <Icon name={it.icon} size={34} color={on ? VIOLET : LIME} />
                    {it.text}
                  </div>
                );
              })}
            </div>
          </Layout>
        </>
      )}
    </Shell>
  );
};

// `pillars`: kafle filarów; `highlight` = kafel stale na limonce, inaczej limonka idzie za ostatnio wypowiedzianym.
// `label` = nagłówek „+ opieka lekarza” nad kaflami, `text` + `resultAt` = pigułka w stopce.
const Pillars: React.FC<OverlayProps> = ({ o, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items(o);
  const times = list.map((it, i) => tOf(it, i, at, 0.12));
  const last = o.highlight ?? lastAt(times, f / fps);
  const resT = o.resultAt != null ? at(o.resultAt) : null;
  const wide = list.length > 4;
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} />
          <Layout
            head={
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <Eyebrow>{o.title}</Eyebrow>
                {o.label && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      opacity: ez(f, fps, 0.3),
                      transform: `translateY(${(1 - ez(f, fps, 0.3)) * 16}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        background: LIME,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon name="plus" size={28} color={VIOLET} />
                    </div>
                    <div
                      style={{
                        fontFamily: MONT,
                        fontWeight: 800,
                        fontSize: 40,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {o.label}
                    </div>
                  </div>
                )}
              </div>
            }
            foot={
              resT != null &&
              o.text && (
                <div style={{ alignSelf: "flex-start" }}>
                  <Tag text={o.text} p={ez(f, fps, resT, 0.45)} light />
                </div>
              )
            }
            center
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: wide ? "1fr 1fr 1fr" : "1fr 1fr",
                gap: 16,
              }}
            >
              {list.map((it, i) => {
                const p = sp(f, fps, times[i]);
                const on = i === last;
                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: 22,
                      padding: "24px 22px",
                      minHeight: wide ? 170 : 200,
                      background: on ? LIME : VIOLET2,
                      color: on ? VIOLET : PAPER,
                      outline: on ? undefined : `1px solid ${LINE}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 18,
                      opacity: Math.min(1, p * 1.6),
                      transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
                    }}
                  >
                    <Icon name={it.icon} size={48} color={on ? VIOLET : LIME} />
                    <div
                      style={{
                        fontFamily: MONT,
                        fontWeight: 800,
                        fontSize: wide ? 30 : 36,
                        lineHeight: 1.08,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {it.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </Layout>
        </>
      )}
    </Shell>
  );
};

// `hub`: opieka lekarza w środku, filary wokół; linie rysują się od środka, gdy filar pada.
const Hub: React.FC<OverlayProps> = ({ o, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items(o);
  return (
    <Shell o={o} src={src}>
      {({ w, h }) => {
        const cx = w / 2,
          cy = h * 0.55;
        const R = Math.min(w * 0.3, h * 0.31);
        const rx = Math.min(R * 1.2, w / 2 - 175); // węzeł (~300 px szerokości) mieści się w karcie
        const pos = list.map((_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / list.length;
          return [cx + Math.cos(a) * rx, cy + Math.sin(a) * R];
        });
        const core = sp(f, fps, 0.25);
        return (
          <>
            <Glow f={f} x="50%" y="55%" />
            <div style={{ position: "absolute", left: 44, top: 40 }}>
              <Eyebrow>{o.title}</Eyebrow>
            </div>
            <svg
              width={w}
              height={h}
              style={{ position: "absolute", inset: 0 }}
            >
              {pos.map(([x, y], i) => {
                const p = ez(f, fps, tOf(list[i], i, at) - 0.1, 0.45);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={cx + (x - cx) * p}
                    y2={cy + (y - cy) * p}
                    stroke={LIME}
                    strokeOpacity={0.55}
                    strokeWidth={3}
                    strokeDasharray="2 10"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            <div
              style={{
                position: "absolute",
                left: cx,
                top: cy,
                width: 210,
                height: 210,
                marginLeft: -105,
                marginTop: -105,
                borderRadius: 105,
                background: LIME,
                color: VIOLET,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                transform: `scale(${core * (1 + 0.02 * Math.sin(f / 15))})`,
                boxShadow:
                  `0 0 0 14px rgba(${ACC_RGB},0.12), 0 0 70px rgba(${ACC_RGB},0.3)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Icon name="plus" size={44} color={VIOLET} />
                <div
                  style={{
                    fontFamily: MONT,
                    fontWeight: 800,
                    fontSize: 30,
                    lineHeight: 1.05,
                    marginTop: 4,
                  }}
                >
                  {o.label}
                </div>
              </div>
            </div>
            {list.map((it, i) => {
              const p = sp(f, fps, tOf(it, i, at));
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: pos[i][0],
                    top: pos[i][1],
                    transform: `translate(-50%, -50%) scale(${0.5 + 0.5 * p})`,
                    opacity: Math.min(1, p * 2),
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 22px",
                    borderRadius: 100,
                    background: VIOLET2,
                    outline: `1px solid ${LINE}`,
                    fontFamily: MONT,
                    fontWeight: 800,
                    fontSize: 30,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name={it.icon} size={30} color={LIME} />
                  {it.text}
                </div>
              );
            })}
          </>
        );
      }}
    </Shell>
  );
};

// `process`: łańcuch mechanizmu z góry na dół, strzałki się rysują, ostatnie ogniwo na limonce.
const Process: React.FC<OverlayProps> = ({ o, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items(o);
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} x="80%" y="85%" />
          <Layout
            head={<Eyebrow>{o.title}</Eyebrow>}
            foot={o.source && <Small>Źródło: {o.source}</Small>}
            center
          >
            {list.map((it, i) => {
              const t = tOf(it, i, at, 0.6);
              const p = sp(f, fps, t);
              const last = i === list.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {i > 0 && (
                    <svg
                      width={40}
                      height={44}
                      viewBox="0 0 40 44"
                      style={{ marginBottom: 6 }}
                    >
                      <path
                        d="M20 2v34m-11-11 11 13 11-13"
                        fill="none"
                        stroke={LIME}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={70}
                        strokeDashoffset={70 * (1 - ez(f, fps, t - 0.3, 0.35))}
                      />
                    </svg>
                  )}
                  <div
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      padding: "20px 26px",
                      borderRadius: 22,
                      background: last ? LIME : VIOLET2,
                      color: last ? VIOLET : PAPER,
                      outline: last ? undefined : `1px solid ${LINE}`,
                      opacity: Math.min(1, p * 1.6),
                      transform: `translateY(${(1 - p) * 30}px) scale(${0.92 + 0.08 * p})`,
                      filter: p < 0.95 ? `blur(${(1 - p) * 8}px)` : undefined,
                    }}
                  >
                    <Icon
                      name={it.icon}
                      size={44}
                      color={last ? VIOLET : LIME}
                    />
                    <div>
                      <div
                        style={{
                          fontFamily: MONT,
                          fontWeight: 800,
                          fontSize: 38,
                          lineHeight: 1.1,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {it.text}
                      </div>
                      {it.sub && (
                        <div
                          style={{
                            fontSize: 22,
                            marginTop: 4,
                            color: last ? VIOLET : MUTED,
                          }}
                        >
                          {it.sub}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Layout>
        </>
      )}
    </Shell>
  );
};

// `steps`: numerowane kroki, linia rysuje się w dół do kolejnego numeru.
const Steps: React.FC<OverlayProps> = ({ o, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items(o);
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} />
          <Layout
            head={<Eyebrow>{o.title}</Eyebrow>}
            foot={o.source && <Small>Źródło: {o.source}</Small>}
            center
          >
            {list.map((it, i) => {
              const t = tOf(it, i, at);
              const p = sp(f, fps, t);
              const more = i + 1 < list.length;
              return (
                <div key={i} style={{ display: "flex", gap: 26 }}>
                  <div
                    style={{ position: "relative", width: 64, flexShrink: 0 }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        background: LIME,
                        color: VIOLET,
                        fontFamily: MONT,
                        fontWeight: 800,
                        fontSize: 30,
                        display: "grid",
                        placeItems: "center",
                        transform: `scale(${p})`,
                      }}
                    >
                      {i + 1}
                    </div>
                    {more && (
                      <div
                        style={{
                          position: "absolute",
                          left: 30,
                          top: 72,
                          bottom: -10,
                          width: 4,
                          borderRadius: 2,
                          background: LIME,
                          opacity: 0.5,
                          transform: `scaleY(${ez(f, fps, t + 0.2, 0.6)})`,
                          transformOrigin: "top",
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      paddingBottom: more ? 26 : 0,
                      paddingTop: 8,
                      opacity: Math.min(1, p * 1.5),
                      transform: `translateX(${(1 - p) * 30}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONT,
                        fontWeight: 800,
                        fontSize: 38,
                        lineHeight: 1.1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {it.text}
                    </div>
                    {it.sub && (
                      <div style={{ fontSize: 23, color: MUTED, marginTop: 6 }}>
                        {it.sub}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Layout>
        </>
      )}
    </Shell>
  );
};

// Limonkowy przycisk ze strzałką w dół (kalendarz konsultacji jest pod filmem na LP).
const Button: React.FC<{
  text: string;
  p: number;
  f: number;
  fps: number;
  size?: number;
}> = ({ text, p, f, fps, size = 34 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: `${size * 0.65}px ${size * 1.1}px`,
      borderRadius: 100,
      background: LIME,
      color: VIOLET,
      fontFamily: JAKARTA,
      fontWeight: 700,
      fontSize: size,
      transform: `scale(${0.7 + 0.3 * p})`,
      opacity: Math.min(1, p * 2),
      boxShadow:
        `0 0 0 12px rgba(${ACC_RGB},0.12), 0 18px 44px rgba(${INK_RGB},0.45)`,
      whiteSpace: "nowrap",
    }}
  >
    {text}
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${Math.sin(Math.max(0, f - fps) / 7) * 8}px)`,
      }}
    >
      <Icon name="down" size={size} color={VIOLET} />
    </span>
  </div>
);

const Pills: React.FC<{ list: It[]; f: number; fps: number; t0: number }> = ({
  list,
  f,
  fps,
  t0,
}) => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
    {list.map((it, i) => {
      const p = ez(f, fps, t0 + i * 0.1);
      return (
        <div
          key={i}
          style={{
            padding: "10px 22px",
            borderRadius: 100,
            background: VIOLET2,
            outline: `1px solid ${LINE}`,
            fontFamily: JAKARTA,
            fontWeight: 700,
            fontSize: 26,
            opacity: p,
            transform: `scale(${0.8 + 0.2 * p})`,
          }}
        >
          {it.text}
        </div>
      );
    })}
  </div>
);

// `cta`: bezpłatna konsultacja — duży tekst, plakietki (15 min · online), przycisk ze strzałką w dół.
const Cta: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} x="30%" y="80%" />
          <Layout head={<Eyebrow>{o.title}</Eyebrow>} center>
            <div
              style={{
                fontFamily: MONT,
                fontWeight: 800,
                fontSize: o.size ?? 78,
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                opacity: ez(f, fps, 0.25),
                transform: `translateY(${(1 - ez(f, fps, 0.25)) * 24}px)`,
              }}
            >
              <Marked
                text={o.text ?? ""}
                hl={o.hl}
                sweep={ez(f, fps, 0.6, 0.6)}
              />
            </div>
            <Pills list={items(o)} f={f} fps={fps} t0={0.5} />
            {o.label && (
              <div style={{ marginTop: 26, display: "flex" }}>
                <Button text={o.label} p={sp(f, fps, 0.45)} f={f} fps={fps} />
              </div>
            )}
          </Layout>
        </>
      )}
    </Shell>
  );
};

// `updown`: wynik badania jako kierunki zmian (↑ / ↓), bez liczb, których jednostek źródło nie podaje.
const UpDown: React.FC<OverlayProps> = ({ o, src, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Shell o={o} src={src}>
      {() => (
        <>
          <Glow f={f} x="15%" y="15%" />
          <Layout
            head={<Eyebrow>{o.title}</Eyebrow>}
            foot={o.source && <Small>Źródło: {o.source}</Small>}
            center
          >
            <div
              style={{
                fontFamily: MONT,
                fontWeight: 800,
                fontSize: 52,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                opacity: ez(f, fps, 0.25),
                marginBottom: 10,
              }}
            >
              {o.text}
            </div>
            {items(o).map((it, i) => {
              const t = tOf(it, i, at, 0.5);
              const p = sp(f, fps, t);
              const up = it.icon === "up";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 22,
                    padding: "16px 22px",
                    borderRadius: 20,
                    background: VIOLET2,
                    outline: `1px solid ${LINE}`,
                    opacity: Math.min(1, p * 1.6),
                    transform: `translateX(${(1 - p) * 40}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      background: up ? LIME : VIOLET,
                      outline: up ? undefined : `2px solid ${LIME}`,
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        transform: `translateY(${(1 - ez(f, fps, t + 0.1, 0.5)) * (up ? 40 : -40)}px)`,
                      }}
                    >
                      <Icon
                        name={it.icon}
                        size={36}
                        color={up ? VIOLET : LIME}
                      />
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: MONT,
                        fontWeight: 800,
                        fontSize: 38,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {it.text}
                    </div>
                    {it.sub && (
                      <div style={{ fontSize: 22, color: MUTED, marginTop: 4 }}>
                        {it.sub}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Layout>
        </>
      )}
    </Shell>
  );
};

// Hasło w panelu (hak, teza) albo na pełnym kadrze (typ `statement`); słowa wchodzą kolejno spod maski.
const Statement: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const full = o.type === "statement";
  const words = (o.text ?? "").split(" ");
  const hl = o.hl?.split(" ") ?? [];
  return (
    <Shell
      o={full ? { ...o, side: "full" } : o}
      src={src}
      bg={full ? `rgba(${BG_RGB},0.96)` : VIOLET}
    >
      {() => (
        <>
          <Glow f={f} x={full ? "50%" : "20%"} y={full ? "60%" : "80%"} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: full ? "0 12%" : 56,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: full ? "center" : "flex-start",
              textAlign: full ? "center" : "left",
              gap: 26,
            }}
          >
            {o.title && <Eyebrow>{o.title}</Eyebrow>}
            <div
              style={{
                fontFamily: MONT,
                fontWeight: 800,
                fontSize: o.size ?? (full ? 136 : 92),
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: full ? "center" : "flex-start",
                columnGap: "0.24em",
              }}
            >
              {words.map((wd, i) => {
                const t = 0.18 + i * 0.09;
                const p = ez(f, fps, t, 0.5);
                const on = hl.includes(wd);
                const m = ez(f, fps, t + 0.35, 0.45);
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      // maska tylko na czas wejścia — potem zakreślacz i ostatnia litera nie są przycinane
                      overflow: p < 0.99 ? "hidden" : "visible",
                      padding: "0 0.06em 0.08em",
                      margin: "0 -0.06em -0.08em",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        position: "relative",
                        transform: `translateY(${(1 - p) * 105}%)`,
                        padding: on ? "0 0.14em" : undefined,
                      }}
                    >
                      {on && (
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "0.2em",
                            background: LIME,
                            clipPath: `inset(0 ${(1 - m) * 100}% 0 0)`,
                          }}
                        />
                      )}
                      <span
                        style={{
                          position: "relative",
                          color: on && m > 0.5 ? VIOLET : PAPER,
                        }}
                      >
                        {wd}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
            {o.label && (
              <Small style={{ fontSize: 26, opacity: ez(f, fps, 0.7) }}>
                {o.label}
              </Small>
            )}
          </div>
        </>
      )}
    </Shell>
  );
};

// Przebitka na pełnym kadrze: od razu kryjąca (wchodzi i schodzi na cięciu), najazd z rozmyciem, metka u góry.
const Broll: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const e = ez(f, fps, 0, 0.4);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: VIOLET }}>
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.4} />}
      <AbsoluteFill
        style={{
          transform: `scale(${1.08 - 0.08 * e})`,
          filter: e < 0.98 ? `blur(${(1 - e) * 18}px)` : undefined,
        }}
      >
        <Media file={o.src!} src={src} trim={o.trim} f={f} dur={dur} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, rgba(${BG_RGB},0.2) 0%, transparent 30%, transparent 55%, rgba(${BG_RGB},0.7) 100%)`,
        }}
      />
      {o.text && (
        <div style={{ position: "absolute", left: 64, top: height * 0.07 }}>
          <Tag text={o.text} p={ez(f, fps, 0.25, 0.45)} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// Plansza końcowa: hasło marki, przycisk konsultacji ze strzałką w dół, plakietki.
const Endcard: React.FC<OverlayProps> = ({ o, src }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <Shell o={{ ...o, side: "full" }} src={src} bg={VIOLET}>
      {() => (
        <>
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at 50% ${45 + 3 * Math.sin(f / 30)}%, rgba(${ACC_RGB},0.14) 0%, transparent 55%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: height * 0.17,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 34,
              textAlign: "center",
            }}
          >
            <Eyebrow>{o.title}</Eyebrow>
            <div
              style={{
                width: width * 0.74,
                fontFamily: MONT,
                fontWeight: 800,
                fontSize: 92,
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                opacity: ez(f, fps, 0.25),
                transform: `translateY(${(1 - ez(f, fps, 0.25)) * 30}px)`,
              }}
            >
              <Marked
                text={o.text ?? ""}
                hl={o.hl}
                sweep={ez(f, fps, 0.7, 0.6)}
              />
            </div>
            {o.label && (
              <Button
                text={o.label}
                p={sp(f, fps, 0.9)}
                f={f}
                fps={fps}
                size={40}
              />
            )}
            <div style={{ opacity: ez(f, fps, 1.2) }}>
              <Pills list={items(o)} f={f} fps={fps} t0={1.2} />
            </div>
          </div>
        </>
      )}
    </Shell>
  );
};

// Cień pod napisami: czytelność jasnych słów na jasnym wnętrzu.
const Scrim: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        `linear-gradient(180deg, transparent 72%, rgba(${INK_RGB},0.42) 88%, rgba(${INK_RGB},0.6) 100%)`,
    }}
  />
);

const KINDS: Record<string, React.FC<OverlayProps>> = {
  media: PanelMedia,
  wall: Wall,
  beforeafter: BeforeAfter,
  stat: Stat,
  checklist: Checklist,
  chips: Chips,
  pillars: Pillars,
  hub: Hub,
  process: Process,
  steps: Steps,
  cta: Cta,
  updown: UpDown,
  statement: Statement,
};

export const isVslOverlay = (type: string) =>
  ["panel", "statement", "broll", "endcard", "scrim"].includes(type);

export const VslOverlay: React.FC<OverlayProps & { palette?: VslPalette }> = ({
  palette = VITAL_VSL,
  ...props
}) => {
  setVslPalette(palette);
  const { o } = props;
  if (o.type === "scrim") return <Scrim />;
  if (o.type === "statement") return <Statement {...props} />;
  if (o.type === "broll") return <Broll {...props} />;
  if (o.type === "endcard") return <Endcard {...props} />;
  if (o.kind === "wall" && o.side === "full") return <FullWall {...props} />;
  const K = KINDS[o.kind ?? "media"] ?? PanelMedia;
  return <K {...props} />;
};
