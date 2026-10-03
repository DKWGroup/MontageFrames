import { fitText } from "@remotion/layout-utils";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Grafiki nakładane na rolkę. Wpis w reel.json -> "overlays": [{ "type": "...", "start", "end", ... }].
// Czasy start/end (i "at" w elementach list) w sekundach ŹRÓDŁA, jak słowa w transkrypcji.
// Język wizualny: frame.md — karty liquid glass, jeden pomarańczowy akcent, żywe ale czyste animacje.
type Item = string | { text: string; at?: number };
type Col = { title: string; items: Item[] };
export type Overlay = {
  type:
    | "title"
    | "counter"
    | "bars"
    | "ring"
    | "line"
    | "list"
    | "compare"
    | "emoji"
    | "media";
  start: number;
  end: number;
  y?: number; // środek grafiki jako część wysokości kadru; bez y wykresy siedzą na dole pod napisami
  x?: number; // środek w poziomie (domyślnie 0.5)
  dim?: boolean; // przyciemnij całe wideo pod grafiką
  title?: string; // nagłówek karty (bars/ring/line/list) — tylko gdy nie dubluje napisu
  label?: string; // podpis (counter/ring)
  text?: string; // title
  hl?: string; // title: fragment na pomarańczowym markerze
  size?: number; // title/counter/emoji: rozmiar fontu
  from?: number; // counter: wartość startowa
  to?: number; // counter: wartość końcowa
  value?: number; // ring: procent
  prefix?: string;
  suffix?: string; // np. " zł", "%", " s"
  decimals?: number;
  data?: { label: string; value: number }[]; // bars
  highlight?: number; // bars: indeks wyróżnionego paska (reszta neutralna)
  max?: number; // bars: wartość = pełna szerokość
  points?: number[]; // line
  labels?: string[]; // line: podpisy osi X (np. ["Tydzień 1", "Tydzień 8"])
  items?: Item[]; // list
  mark?: "num" | "check" | "x" | "dot"; // list
  left?: Col; // compare: "było" (przygaszone, przekreślane)
  right?: Col; // compare: "jest" (akcent)
  emoji?: string;
  src?: string; // media: plik w folderze rolki (mp4/mov/webm/png/jpg)
  fit?: "full" | "card" | "overlay"; // media: pełny ekran / karta / przezroczysta nakładka
  aspect?: number; // media card: wysokość/szerokość
  volume?: number; // media: głośność B-rollu (domyślnie 0)
  trim?: number; // media: od której sekundy pliku startować
};
type P = {
  o: Overlay;
  dur: number;
  src: (file: string) => string;
  at: (sourceSec: number) => number; // czas źródła -> sekundy od początku grafiki
};
type B = P & { p: number; exit: number }; // p = sprężyna wejścia, exit = 0..1 wyjścia

// ——— Tokeny (lustro frame.md) ———
const C = {
  font: '"MADE Tommy Soft", Nunito, sans-serif',
  accent: "#FF6B1A",
  glow: "rgba(255,107,26,0.55)",
  ink: "#1A0F08", // tekst na pomarańczu
  paper: "#FFF6EE", // ciepła biel zamiast #FFF
  muted: "rgba(255,246,238,0.7)",
  faint: "rgba(255,246,238,0.16)",
  shadow: "0 2px 16px rgba(20,12,6,0.5)",
  radius: 48,
  width: 0.84, // szerokość grafik względem kadru
  bottom: 0.79, // dolna krawędź grafik pod napisami (niżej zasłania UI Instagrama)
};
// Liquid glass: przyciemnione, mocno rozmyte i lekko nasycone tło spod karty + połysk krawędzi
const GLASS: React.CSSProperties = {
  background:
    "linear-gradient(155deg, rgba(42,31,24,0.55) 0%, rgba(14,10,7,0.68) 100%)",
  backdropFilter: "blur(36px) saturate(165%) brightness(0.62)",
  WebkitBackdropFilter: "blur(36px) saturate(165%) brightness(0.62)",
  border: "1.5px solid rgba(255,255,255,0.16)",
  boxShadow:
    "inset 0 1.5px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.4)",
  overflow: "hidden",
  boxSizing: "border-box",
};
// Krzywe ruchu: każda rola ma swoją
const EXPO = Easing.bezier(0.16, 1, 0.3, 1); // wejścia
const QUART = Easing.bezier(0.25, 1, 0.5, 1); // odliczanie liczb
const INOUT = Easing.bezier(0.65, 0, 0.35, 1); // rysowanie linii, połysk
const EXIT = Easing.bezier(0.5, 0, 0.75, 0); // wyjścia — przyspieszają
const SOFT = { damping: 16, stiffness: 150, mass: 0.8 }; // karty
const POP = { damping: 10, stiffness: 190, mass: 0.6 }; // znaczniki, kropki
const GROW = { damping: 18, stiffness: 110, mass: 0.9 }; // paski
// Te typy mają stałą pozycję (środek). Reszta siedzi na dole, pod napisami — patrz PREFERENCJE.md.
const DEFAULT_Y: Partial<Record<Overlay["type"], number>> = {
  title: 0.17,
  emoji: 0.3,
};

// Grafika na dole kadru -> napisy w tym czasie podnoszą się nad nią (src/Reel.tsx)
export const atBottom = (o: Overlay) =>
  o.y == null &&
  DEFAULT_Y[o.type] == null &&
  !(o.type === "media" && o.fit !== "card");

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fmt = (v: number, d = 0) =>
  new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(v);
const itemText = (it: Item) => (typeof it === "string" ? it : it.text);
const itemAt = (it: Item, i: number, at: P["at"], base = 0.3, gap = 0.4) =>
  typeof it !== "string" && it.at != null ? at(it.at) : base + i * gap;
const isVideo = (file: string) => /\.(mp4|mov|webm|m4v)$/i.test(file);

const useAnim = () => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // 0..1 od `sec` przez `len` sekund
  const t = (sec: number, len: number, easing = EXPO) =>
    interpolate(f, [sec * fps, (sec + len) * fps], [0, 1], {
      ...clamp,
      easing,
    });
  // sprężyna startująca po `sec` sekundach
  const pop = (sec: number, config = SOFT) =>
    spring({ frame: Math.max(0, f - Math.round(sec * fps)), fps, config });
  return { f, fps, width, height, t, pop };
};

// Wsuwanie z rozmyciem (dla treści wewnątrz karty)
const reveal = (s: number, dx = 0, dy = 22): React.CSSProperties => ({
  opacity: Math.min(1, s * 1.4),
  transform: `translate(${(1 - s) * dx}px, ${(1 - s) * dy}px)`,
  filter: s < 0.98 ? `blur(${Math.max(0, 1 - s) * 8}px)` : undefined,
});

const NUM: React.CSSProperties = {
  fontWeight: 900,
  letterSpacing: "-0.03em",
  fontVariantNumeric: "tabular-nums",
  color: C.paper,
};
const LABEL: React.CSSProperties = {
  fontWeight: 700,
  color: C.muted,
  lineHeight: 1.15,
};

// Karta liquid glass. Przezroczystość i ruch na samej karcie — rodzic z opacity < 1 wyłączyłby rozmycie tła.
const Glass: React.FC<{
  p: number;
  exit: number;
  from?: "bottom" | "left" | "right";
  pad?: number | string;
  radius?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({
  p,
  exit,
  from = "bottom",
  pad = 48,
  radius = C.radius,
  style,
  children,
}) => {
  const { t } = useAnim();
  const dx = from === "left" ? -90 : from === "right" ? 90 : 0;
  const dy = from === "bottom" ? 60 : 0;
  const sweep = t(0.35, 1.1, INOUT); // połysk przelatuje po szkle po wejściu
  return (
    <div
      style={{
        ...GLASS,
        position: "relative",
        borderRadius: radius,
        padding: pad,
        opacity: Math.min(1, p * 1.6) * (1 - exit),
        transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy + exit * 24}px) scale(${0.93 + 0.07 * p - 0.03 * exit})`,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 70% at 15% 0%, rgba(255,255,255,0.13), transparent 60%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -60,
          bottom: -60,
          width: "38%",
          left: `${-45 + sweep * 165}%`,
          background:
            "linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent)",
          transform: "skewX(-16deg)",
          opacity: sweep < 1 ? 1 : 0,
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};

const CardTitle: React.FC<{ o: Overlay; s: number }> = ({ o, s }) =>
  o.title ? (
    <div style={{ ...LABEL, fontSize: 46, marginBottom: 28, ...reveal(s) }}>
      {o.title}
    </div>
  ) : null;

const Badge: React.FC<{
  mark: NonNullable<Overlay["mark"]>;
  n: number;
  s: number;
  size?: number;
}> = ({ mark, n, s, size = 64 }) => (
  <div
    style={{
      width: mark === "dot" ? size / 3.5 : size,
      height: mark === "dot" ? size / 3.5 : size,
      borderRadius: size,
      background: mark === "x" ? "rgba(255,246,238,0.22)" : C.accent,
      boxShadow: mark === "x" ? undefined : `0 0 24px ${C.glow}`,
      color: mark === "x" ? C.paper : C.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.52,
      fontWeight: 900,
      flexShrink: 0,
      transform: `scale(${s})`,
    }}
  >
    {mark === "num" ? n : mark === "check" ? "✓" : mark === "x" ? "✕" : ""}
  </div>
);

// Tytuł-hak u góry: fragment `hl` dostaje pomarańczowy marker przeciągany od lewej
const TitleBody: React.FC<B> = ({ o, p, exit }) => {
  const { pop } = useAnim();
  const text = o.text ?? "";
  const i = o.hl ? text.indexOf(o.hl) : -1;
  const m = pop(0.25, { damping: 22, stiffness: 140, mass: 0.6 });
  return (
    <div
      style={{
        fontSize: o.size ?? 92,
        fontWeight: 900,
        lineHeight: 1.12,
        letterSpacing: "-0.02em",
        textAlign: "center",
        textShadow: C.shadow,
        opacity: Math.min(1, p * 1.5) * (1 - exit),
        transform: `translateY(${(1 - p) * 40 - exit * 20}px) scale(${0.94 + 0.06 * p})`,
      }}
    >
      {i < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, i)}
          <span
            style={{
              background: `linear-gradient(${C.accent}, ${C.accent}) no-repeat left / ${m * 100}% 100%`,
              color: m > 0.6 ? C.ink : C.paper,
              textShadow: m > 0.6 ? "none" : C.shadow,
              padding: "0 0.14em",
              borderRadius: 18,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {o.hl}
          </span>
          {text.slice(i + (o.hl?.length ?? 0))}
        </>
      )}
    </div>
  );
};

// Liczba-bohater na szkle: odlicza się, pod nią podpis i pasek postępu ze świeceniem
const CounterBody: React.FC<B> = ({ o, p, exit }) => {
  const { width, t, pop } = useAnim();
  const to = o.to ?? 0;
  const from = o.from ?? 0;
  const n = t(0.15, 1.3, QUART);
  const final = `${o.prefix ?? ""}${fmt(to, o.decimals)}${o.suffix ?? ""}`;
  const size = Math.min(
    o.size ?? 180,
    fitText({
      text: final,
      withinWidth: width * C.width - 96,
      fontFamily: C.font,
      fontWeight: 900,
      letterSpacing: "-0.03em",
      validateFontIsLoaded: false,
    }).fontSize,
  );
  return (
    <Glass p={p} exit={exit} pad="46px 48px 44px">
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            ...NUM,
            fontSize: size,
            lineHeight: 0.95,
            ...reveal(pop(0.05)),
          }}
        >
          {o.prefix}
          {fmt(from + (to - from) * n, o.decimals)}
          {o.suffix}
        </div>
        {o.label && (
          <div
            style={{
              ...LABEL,
              fontSize: 52,
              marginTop: 14,
              ...reveal(pop(0.45)),
            }}
          >
            {o.label}
          </div>
        )}
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: C.faint,
          marginTop: 30,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${n * 100}%`,
            borderRadius: 4,
            background: C.accent,
            boxShadow: `0 0 22px ${C.glow}`,
          }}
        />
      </div>
    </Glass>
  );
};

// Paski rosną sprężyście jeden po drugim, wartości odliczają się, wyróżniony świeci
const BarsBody: React.FC<B> = ({ o, p, exit }) => {
  const { pop } = useAnim();
  const data = o.data ?? [];
  const max = o.max ?? Math.max(...data.map((d) => d.value));
  return (
    <Glass p={p} exit={exit}>
      <CardTitle o={o} s={pop(0.1)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {data.map((d, i) => {
          const a = 0.15 + i * 0.18;
          const g = pop(a + 0.12, GROW);
          const on = o.highlight == null || o.highlight === i;
          return (
            <div key={d.label} style={reveal(pop(a), -30, 0)}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    ...LABEL,
                    fontSize: 46,
                    color: on ? C.paper : C.muted,
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    ...NUM,
                    fontSize: 58,
                    color: on ? C.paper : C.muted,
                  }}
                >
                  {o.prefix}
                  {fmt(d.value * Math.min(g, 1), o.decimals)}
                  {o.suffix}
                </span>
              </div>
              <div
                style={{ height: 24, borderRadius: 12, background: C.faint }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(d.value / max) * 100 * g}%`,
                    borderRadius: 12,
                    background: on ? C.accent : "rgba(255,246,238,0.5)",
                    boxShadow: on ? `0 0 26px ${C.glow}` : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
};

// Pierścień rysuje się ze świeceniem, liczba w środku odlicza, podpis wjeżdża z prawej
const RingBody: React.FC<B> = ({ o, p, exit }) => {
  const { t, pop } = useAnim();
  const k = t(0.2, 1.3, QUART);
  const v = (o.value ?? 0) * k;
  const R = 112;
  const S = 22;
  const box = 2 * (R + S);
  const c = 2 * Math.PI * R;
  return (
    <Glass p={p} exit={exit}>
      <CardTitle o={o} s={pop(0.1)} />
      <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
        <div
          style={{
            position: "relative",
            width: box,
            height: box,
            flexShrink: 0,
          }}
        >
          <svg
            width={box}
            height={box}
            style={{ transform: "rotate(-90deg)", overflow: "visible" }}
          >
            <circle
              cx={box / 2}
              cy={box / 2}
              r={R}
              fill="none"
              stroke={C.faint}
              strokeWidth={S}
            />
            <circle
              cx={box / 2}
              cy={box / 2}
              r={R}
              fill="none"
              stroke={C.accent}
              strokeWidth={S}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - Math.min(v, 100) / 100)}
              opacity={v > 0.3 ? 1 : 0}
              style={{ filter: `drop-shadow(0 0 ${8 + 10 * k}px ${C.glow})` }}
            />
          </svg>
          <div
            style={{
              ...NUM,
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 76,
            }}
          >
            {fmt(v, o.decimals)}
            {o.suffix ?? "%"}
          </div>
        </div>
        {o.label && (
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.1,
              ...reveal(pop(0.5), 40, 0),
            }}
          >
            {o.label}
          </div>
        )}
      </div>
    </Glass>
  );
};

// Linia rysuje się ze świecącą głowicą, pod nią poświata; na końcu wyskakuje pomarańczowa wartość
const LineBody: React.FC<B> = ({ o, p, exit }) => {
  const { width, t, pop } = useAnim();
  const pts = o.points ?? [];
  const W = width * C.width - 96;
  const H = 250;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const xy = pts.map((v, i) => [
    (i / Math.max(1, pts.length - 1)) * W,
    H - 14 - ((v - lo) / (hi - lo || 1)) * (H - 90),
  ]);
  const d = xy
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const k = t(0.25, 1.4, INOUT);
  // pozycja głowicy: punkt na łamanej po przebyciu k jej długości
  const segs = xy
    .slice(1)
    .map(([x, y], i) => Math.hypot(x - xy[i][0], y - xy[i][1]));
  let left = k * segs.reduce((a, b) => a + b, 0);
  let [hx, hy] = xy[0] ?? [0, 0];
  for (let i = 0; i < segs.length; i++) {
    const r = Math.min(1, left / (segs[i] || 1));
    hx = xy[i][0] + (xy[i + 1][0] - xy[i][0]) * r;
    hy = xy[i][1] + (xy[i + 1][1] - xy[i][1]) * r;
    left -= segs[i];
    if (left <= 0) break;
  }
  const end = pop(1.6, POP);
  const id = `ln${Math.round(o.start * 1000)}`;
  return (
    <Glass p={p} exit={exit}>
      <CardTitle o={o} s={pop(0.1)} />
      <div style={{ position: "relative" }}>
        <svg
          width={W}
          height={H}
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.accent} stopOpacity={0.38} />
              <stop offset="1" stopColor={C.accent} stopOpacity={0} />
            </linearGradient>
            <clipPath id={`${id}c`}>
              <rect x={-20} y={-80} width={hx + 20} height={H + 160} />
            </clipPath>
          </defs>
          <line x1={0} x2={W} y1={H} y2={H} stroke={C.faint} strokeWidth={3} />
          <path
            d={`${d} L${W},${H} L0,${H} Z`}
            fill={`url(#${id}g)`}
            clipPath={`url(#${id}c)`}
          />
          <path
            d={d}
            fill="none"
            stroke={C.accent}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - k}
            style={{ filter: `drop-shadow(0 0 10px ${C.glow})` }}
          />
          <circle
            cx={hx}
            cy={hy}
            r={26}
            fill={C.accent}
            opacity={0.22 * Math.min(1, k * 4)}
          />
          <circle
            cx={hx}
            cy={hy}
            r={12}
            fill={C.paper}
            stroke={C.accent}
            strokeWidth={6}
            opacity={Math.min(1, k * 4)}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: hx,
            top: hy - 44,
            transform: `translate(-100%, -100%) scale(${end})`,
            transformOrigin: "100% 100%",
            padding: "8px 22px",
            borderRadius: 999,
            background: C.accent,
            boxShadow: `0 0 26px ${C.glow}`,
            color: C.ink,
            ...NUM,
            fontSize: 48,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.ink }}>
            {o.prefix}
            {fmt(pts[pts.length - 1] ?? 0, o.decimals)}
            {o.suffix}
          </span>
        </div>
      </div>
      {o.labels && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 18,
            ...LABEL,
            fontSize: 38,
            ...reveal(pop(0.3)),
          }}
        >
          {o.labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </Glass>
  );
};

// Lista: znacznik wyskakuje, tekst wjeżdża z lewej dokładnie wtedy, gdy punkt pada; linie się rysują
const ListBody: React.FC<B> = ({ o, at, p, exit }) => {
  const { t, pop } = useAnim();
  const mark = o.mark ?? "num";
  const items = o.items ?? [];
  return (
    <Glass p={p} exit={exit}>
      <CardTitle o={o} s={pop(0.1)} />
      {items.map((it, i) => {
        const s = itemAt(it, i, at);
        return (
          <div key={itemText(it)}>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <Badge mark={mark} n={i + 1} s={pop(s, POP)} />
              <span
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  ...reveal(pop(s + 0.05), -40, 0),
                }}
              >
                {itemText(it)}
              </span>
            </div>
            {i < items.length - 1 && (
              <div
                style={{
                  height: 2,
                  margin: "22px 0 22px 92px",
                  background: C.faint,
                  transform: `scaleX(${t(s + 0.15, 0.6, INOUT)})`,
                  transformOrigin: "left",
                }}
              />
            )}
          </div>
        );
      })}
    </Glass>
  );
};

// Było / Jest: dwie szklane karty wjeżdżają z przeciwnych stron; „było” przekreśla się, „jest” świeci
const CompareBody: React.FC<B> = ({ o, at, exit }) => {
  const { t, pop } = useAnim();
  const first = o.right?.items[0];
  const rightBase =
    first && typeof first !== "string" && first.at != null
      ? at(first.at) - 0.25
      : 0.6 + (o.left?.items.length ?? 0) * 0.4;
  const col = (c: Col | undefined, was: boolean, base: number) =>
    c && (
      <Glass
        p={pop(base)}
        exit={exit}
        from={was ? "left" : "right"}
        pad="36px 34px"
        radius={40}
        style={{ flex: 1 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 48,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          <Badge
            mark={was ? "x" : "check"}
            n={0}
            s={pop(base + 0.12, POP)}
            size={54}
          />
          <span style={{ color: was ? C.muted : C.paper }}>{c.title}</span>
        </div>
        {c.items.map((it, i) => {
          const s = itemAt(it, i, at, base + 0.3);
          return (
            <div
              key={itemText(it)}
              style={{ marginTop: 16, ...reveal(pop(s), 0, 18) }}
            >
              <span
                style={{
                  position: "relative",
                  fontSize: 46,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: was ? C.muted : C.paper,
                }}
              >
                {itemText(it)}
                {was && (
                  <span
                    style={{
                      position: "absolute",
                      left: -4,
                      right: -4,
                      top: "54%",
                      height: 4,
                      borderRadius: 2,
                      background: C.accent,
                      transform: `scaleX(${t(s + 0.35, 0.45, INOUT)})`,
                      transformOrigin: "left",
                    }}
                  />
                )}
              </span>
            </div>
          );
        })}
      </Glass>
    );
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "stretch" }}>
      {col(o.left, true, 0)}
      {col(o.right, false, rightBase)}
    </div>
  );
};

// Naklejka: sprężysty pop i lekkie kołysanie
const EmojiBody: React.FC<B> = ({ o, exit }) => {
  const { f, fps, pop } = useAnim();
  const s = pop(0, POP);
  return (
    <div
      style={{
        fontSize: o.size ?? 160,
        lineHeight: 1,
        opacity: Math.min(1, s * 2) * (1 - exit),
        transform: `scale(${s}) rotate(${Math.sin((f / fps) * 3) * 5}deg)`,
      }}
    >
      {o.emoji}
    </div>
  );
};

const MediaEl: React.FC<P & { style: React.CSSProperties }> = ({
  o,
  src,
  style,
}) => {
  const { fps } = useVideoConfig();
  if (!o.src) return null;
  return isVideo(o.src) ? (
    <OffthreadVideo
      src={src(o.src)}
      transparent={o.fit === "overlay"}
      volume={o.volume ?? 0}
      trimBefore={o.trim ? Math.round(o.trim * fps) : undefined}
      style={style}
    />
  ) : (
    <Img src={src(o.src)} style={style} />
  );
};

// Zdjęcie / B-roll w szklanej ramce
const MediaCard: React.FC<B> = (b) => {
  const { width } = useAnim();
  return (
    <Glass p={b.p} exit={b.exit} pad={10} radius={44}>
      <MediaEl
        {...b}
        style={{
          width: "100%",
          height: (width * C.width - 20) * (b.o.aspect ?? 1),
          objectFit: "cover",
          display: "block",
          borderRadius: 34,
        }}
      />
    </Glass>
  );
};

// B-roll na cały ekran (fit: "full") albo przezroczysta nakładka (fit: "overlay")
const MediaFull: React.FC<P> = (p) => {
  const { f, fps, t } = useAnim();
  const enter = t(0, 0.35);
  const exit = interpolate(f, [p.dur - 0.25 * fps, p.dur], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(enter, 1 - exit),
        transform: `scale(${1.04 - 0.04 * enter})`,
      }}
    >
      <MediaEl
        {...p}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

const BODIES: Record<Overlay["type"], React.FC<B>> = {
  title: TitleBody,
  counter: CounterBody,
  bars: BarsBody,
  ring: RingBody,
  line: LineBody,
  list: ListBody,
  compare: CompareBody,
  emoji: EmojiBody,
  media: MediaCard,
};

// Wspólne: pozycja i czas wejścia/wyjścia. Bez opacity na tym poziomie (zabiłoby blur szkła).
export const OverlayView: React.FC<P> = (props) => {
  const { o, dur } = props;
  const { f, fps, width, height, pop } = useAnim();
  const Body = BODIES[o.type];
  if (!Body) return null;
  if (o.type === "media" && o.fit !== "card") return <MediaFull {...props} />;

  const bottom = atBottom(o);
  const p = pop(0.05);
  const exitLen = Math.max(1, Math.min(0.3 * fps, dur / 3));
  const exit = interpolate(f, [dur - exitLen, dur], [0, 1], {
    ...clamp,
    easing: EXIT,
  });
  return (
    <AbsoluteFill style={{ fontFamily: C.font, color: C.paper }}>
      {o.dim && (
        <AbsoluteFill
          style={{
            background: "rgba(20,12,6,0.5)",
            opacity: Math.min(p, 1) * (1 - exit),
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: (o.x ?? 0.5) * width,
          top: (bottom ? C.bottom : (o.y ?? DEFAULT_Y[o.type] ?? 0.5)) * height,
          width:
            o.type === "emoji"
              ? undefined
              : width * (o.type === "title" ? 0.92 : C.width),
          transform: `translate(-50%, ${bottom ? -100 : -50}%)`,
        }}
      >
        <Body {...props} p={p} exit={exit} />
      </div>
    </AbsoluteFill>
  );
};
