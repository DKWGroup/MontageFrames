// Paczka animacji long form (Kacper Bisanz): przezroczyste karty 16:9, każda renderowana osobno do ProRes 4444.
// Język: biała karta, metka Menlo „drukuje się” jak karta pokładowa, karta rozwija się od góry; liczby w #066FED.
// Projekt w 1920×1080, render ze scale 2 → 4K. Strefy: L (lewa kolumna), R (prawy górny róg, nad tablicą XTB), C (środek z przyciemnieniem).
import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { loadFonts } from "../fonts";
import { BISANZ } from "../styles/bisanz";

const K = {
  blue: BISANZ.accent,
  ink: BISANZ.cardText,
  white: BISANZ.card,
  line: BISANZ.cardBorder,
  muted: "#737373",
  tint: "#EEF4FE",
  gray: "#F2F2F2",
  bar: "#C4C4C4",
  font: BISANZ.font,
  mono: BISANZ.label.font,
  shadow:
    "drop-shadow(0 22px 34px rgba(20,20,20,0.28)) drop-shadow(0 3px 6px rgba(20,20,20,0.18))",
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SCALE = 1.15; // czytelność na telefonie: karty większe niż projekt bazowy
const pad = (n: number) => String(n).padStart(2, "0");
// 1800 → „1 800”, 2.9 → „2,9” (spacja nierozdzielająca, przecinek dziesiętny)
const fmt = (v: number, d = 0) => {
  const [i, frac] = v.toFixed(d).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (frac ? `,${frac}` : "");
};

type Logo = {
  src?: string;
  text?: string;
  sub?: string;
  h?: number;
  at?: number;
};
type Row = {
  text: string;
  value?: string;
  mark?: "check" | "x" | "num" | "dot";
  at?: number;
  strike?: number;
  hl?: boolean;
};
type Result = {
  label: string;
  to: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  at?: number;
  cash?: boolean;
};
type Side = {
  label: string;
  title: string;
  items?: string[];
  logos?: Logo[];
  at?: number;
  keep?: boolean;
  price?: { label: string; text: string; at?: number };
};
// Kwota w nagraniu ekranu: okno wyróżnienia (s), stałe pudełko (ułamki ekranu) i środek w pionie w czasie [t, cy].
type Highlight = {
  label: string;
  price: string;
  start: number;
  end: number;
  box: { x: number; w: number; h: number };
  pts: [number, number][];
};
type IconName = keyof typeof ICONS;
export type Item = {
  slug: string;
  type:
    | "chapter"
    | "logos"
    | "rows"
    | "compare"
    | "bars"
    | "counter"
    | "flow"
    | "calendar"
    | "statement"
    | "photo"
    | "cta"
    | "line"
    | "grid"
    | "notify"
    | "phone";
  zone: "L" | "R" | "C" | "A";
  at: number;
  dur: number;
  y?: number;
  label?: string;
  title?: string;
  sub?: string;
  text?: string;
  source?: string;
  note?: string;
  n?: number;
  logos?: Logo[];
  caption?: string;
  captionAt?: number;
  rows?: Row[];
  result?: Result;
  cashAt?: number;
  a?: Side;
  b?: Side;
  bars?: {
    label: string;
    value: number;
    display: string;
    at?: number;
    hl?: boolean;
  }[];
  max?: number;
  to?: number;
  decimals?: number;
  suffix?: string;
  unit?: string;
  nodes?: { icon: IconName; text: string; at?: number }[];
  months?: {
    on?: number[];
    onAt?: number;
    today?: number;
    planes?: number[];
    planesAt?: number;
  };
  hlAt?: number;
  src?: string;
  tag?: string;
  button?: string;
  icon?: IconName;
  pressAt?: number;
  series?: {
    per: number;
    fixed: number;
    months: number;
    perLabel: string;
    fixedLabel: string;
  };
  crossAt?: number;
  grid?: { name: string; action: string }[];
  app?: string;
  highlights?: Highlight[];
  file?: string;
  sfx?: { at: number; s: string }[];
};

// Ikony: kreska 2 px na siatce 24 (samolot: Lucide, ISC).
const ICONS = {
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  disk: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 14h5M16.5 12h.01" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4.5 4.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="3" width="16" height="15" rx="3" />
      <path d="M4 11h16M8 18v2M16 18v2M7.5 14.5h.01M16.5 14.5h.01" />
    </>
  ),
  mountain: <path d="M3 20 9.5 9l4 6 2.5-4L21 20z" />,
  plane: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
};
const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
  width?: number;
}> = ({ name, size = 28, color = K.blue, width = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {ICONS[name]}
  </svg>
);

const Ctx = React.createContext<{ item: Item; base: string }>(null!);
const useT = () => {
  const { item, base } = React.useContext(Ctx);
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  return {
    item,
    base,
    t,
    rel: (a: number | undefined, d: number) => (a == null ? d : a - item.at),
    sp: (start: number, config = {}) =>
      spring({
        frame: f - Math.round(start * fps),
        fps,
        config: { damping: 22, stiffness: 180, mass: 0.9, ...config },
      }),
    ramp: (a: number, b: number, easing = Easing.bezier(0.16, 1, 0.3, 1)) =>
      interpolate(t, [a, b], [0, 1], { ...clamp, easing }),
  };
};

// Karta: wejście = rozwinięcie od góry (clip) + krótkie uniesienie, wyjście szybsze w górę.
const Shell: React.FC<{
  width?: number | "auto";
  bare?: boolean;
  children: React.ReactNode;
}> = ({ width, bare, children }) => {
  const { item, ramp } = useT();
  const inP = ramp(0, 0.55);
  const fade = ramp(0, 0.14, Easing.linear);
  const out = ramp(item.dur - 0.32, item.dur, Easing.in(Easing.cubic));
  const w = width ?? (item.zone === "C" ? 1100 : 560);
  const lift = (1 - inP) * 26 - out * 16;
  const pos: React.CSSProperties =
    item.zone === "L"
      ? { left: 72, top: item.y ?? 104 }
      : item.zone === "R"
        ? { right: 72, top: item.y ?? 84 }
        : { left: "50%", top: "50%" };
  return (
    <AbsoluteFill>
      {item.zone === "C" && (
        <AbsoluteFill
          style={{ background: `rgba(20,20,20,${0.55 * fade * (1 - out)})` }}
        />
      )}
      <div
        style={{
          position: "absolute",
          ...pos,
          width: w,
          transform:
            item.zone === "C"
              ? `translate(-50%, calc(-50% + ${lift}px)) scale(${SCALE})`
              : `translateY(${lift}px) scale(${SCALE})`,
          transformOrigin:
            item.zone === "L"
              ? "top left"
              : item.zone === "R"
                ? "top right"
                : "center",
          opacity: fade * (1 - out),
          filter: K.shadow,
          fontFamily: K.font,
          color: K.ink,
        }}
      >
        {bare ? (
          children
        ) : (
          <div
            style={{
              background: K.white,
              borderRadius: 22,
              padding: "26px 30px 28px",
              clipPath: `inset(0 0 ${(1 - inP) * 100}% 0 round 22px)`,
            }}
          >
            {children}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ text?: string; color?: string }> = ({
  text,
  color = K.blue,
}) => {
  const { t } = useT();
  if (!text) return null;
  const n = Math.round(interpolate(t, [0.08, 0.5], [0, text.length], clamp));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: K.mono,
        fontSize: 17,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: color,
          flexShrink: 0,
        }}
      />
      <span>
        {text.slice(0, n)}
        <span style={{ opacity: 0 }}>{text.slice(n)}</span>
      </span>
    </div>
  );
};
const Title: React.FC<{ text?: string; size?: number; top?: number }> = ({
  text,
  size = 38,
  top = 12,
}) =>
  text ? (
    <div
      style={{
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.03em",
        lineHeight: 1.08,
        marginTop: top,
      }}
    >
      {text}
    </div>
  ) : null;
const Foot: React.FC = () => {
  const { item, ramp } = useT();
  if (!item.source && !item.note) return null;
  return (
    <div style={{ marginTop: 18, opacity: ramp(0.6, 1.1) }}>
      {item.note && (
        <div style={{ fontSize: 19, color: K.muted, lineHeight: 1.35 }}>
          {item.note}
        </div>
      )}
      {item.source && (
        <div
          style={{
            fontFamily: K.mono,
            fontSize: 15,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: K.muted,
            marginTop: item.note ? 8 : 0,
          }}
        >
          Źródło: {item.source}
        </div>
      )}
    </div>
  );
};
const LogoView: React.FC<{ l: Logo; h?: number }> = ({ l, h = 40 }) => {
  const { base } = useT();
  const img = l.src && (
    <Img
      src={staticFile(`${base}/logos/${l.src}`)}
      style={{ height: l.h ?? h, width: "auto", display: "block" }}
    />
  );
  if (img && l.text)
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {img}
        <span
          style={{
            fontWeight: 700,
            fontSize: Math.round((l.h ?? h) * 0.72),
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {l.text}
        </span>
      </span>
    );
  return img ? (
    img
  ) : (
    <span
      style={{
        fontWeight: 700,
        fontSize: Math.round((l.h ?? h) * 0.72),
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {l.text}
    </span>
  );
};
const Logos: React.FC<{
  logos?: Logo[];
  h?: number;
  top?: number;
  start?: number;
}> = ({ logos, h = 40, top = 16, start = 0.3 }) => {
  const { rel, sp } = useT();
  if (!logos?.length) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "center",
        marginTop: top,
        flexWrap: "wrap",
      }}
    >
      {logos.map((l, i) => {
        const s = sp(rel(l.at, start + i * 0.18), {
          damping: 15,
          stiffness: 190,
        });
        return (
          <div
            key={i}
            style={{
              opacity: Math.min(1, s * 1.5),
              transform: `scale(${0.7 + 0.3 * s})`,
              transformOrigin: "left center",
            }}
          >
            <LogoView l={l} h={h} />
          </div>
        );
      })}
    </div>
  );
};
// Tekst z **zakreślaczem**: niebieskie tło przejeżdża od lewej, litery bieleją.
const Marked: React.FC<{ text: string; p: number }> = ({ text, p }) => (
  <>
    {text.split("**").map((part, i) =>
      i % 2 ? (
        <span
          key={i}
          style={{
            backgroundImage: `linear-gradient(${K.blue}, ${K.blue})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${p * 100}% 100%`,
            color: interpolateColors(p, [0.3, 0.75], [K.ink, K.white]),
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            padding: "0 0.12em",
            borderRadius: "0.14em",
          }}
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);
const Mark: React.FC<{ mark?: Row["mark"]; i: number }> = ({ mark, i }) => {
  if (!mark) return null;
  if (mark === "num")
    return (
      <span
        style={{
          fontFamily: K.mono,
          fontSize: 17,
          color: K.blue,
          width: 30,
          flexShrink: 0,
        }}
      >
        {pad(i + 1)}
      </span>
    );
  if (mark === "dot")
    return (
      <span
        style={{
          width: 30,
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{ width: 10, height: 10, borderRadius: 5, background: K.blue }}
        />
      </span>
    );
  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        background: mark === "check" ? K.blue : K.gray,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <Icon
        name={mark}
        size={18}
        color={mark === "check" ? K.white : K.muted}
        width={3}
      />
    </span>
  );
};
const ResultView: React.FC<{ r: Result; start: number; size?: number }> = ({
  r,
  start,
  size = 76,
}) => {
  const { t, sp } = useT();
  const s = sp(start);
  const v = interpolate(t - start, [0, 1], [r.from ?? 0, r.to], {
    ...clamp,
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });
  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 18,
        borderTop: `3px solid ${K.blue}`,
        opacity: s,
        transform: `translateY(${(1 - s) * 16}px)`,
      }}
    >
      <Label text={r.label} />
      <div
        style={{
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "-0.04em",
          color: K.blue,
          lineHeight: 1,
          marginTop: 10,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {r.prefix}
        {fmt(v, r.decimals)}
        {r.suffix}
      </div>
    </div>
  );
};

const Chapter: React.FC = () => {
  const { item, ramp } = useT();
  return (
    <Shell>
      <Label text={item.n ? `Abonament ${pad(item.n)} / 17` : item.label} />
      <Logos logos={item.logos} h={44} top={18} />
      <Title text={item.title} size={40} top={item.logos ? 14 : 12} />
      {item.sub && (
        <div
          style={{
            fontWeight: 600,
            fontSize: 22,
            lineHeight: 1.3,
            color: K.muted,
            marginTop: 8,
          }}
        >
          {item.sub}
        </div>
      )}
      {item.n && (
        <div style={{ display: "flex", gap: 5, marginTop: 22 }}>
          {Array.from({ length: 17 }, (_, k) => {
            const fill =
              k < item.n! - 1 ? 1 : k === item.n! - 1 ? ramp(0.45, 1.05) : 0;
            return (
              <div
                key={k}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: K.line,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${fill * 100}%`,
                    background: K.blue,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
      <Foot />
    </Shell>
  );
};

const Rows: React.FC = () => {
  const { item, rel, sp, ramp } = useT();
  const rows = item.rows ?? [];
  return (
    <Shell>
      <Label text={item.label} />
      <Title text={item.title} />
      <Logos logos={item.logos} h={30} top={14} />
      <div style={{ marginTop: 12 }}>
        {rows.map((r, i) => {
          const s = sp(rel(r.at, 0.35 + i * 0.3));
          const struck =
            r.strike != null
              ? ramp(rel(r.strike, 0), rel(r.strike, 0) + 0.35)
              : 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "13px 0",
                borderTop: i ? `2px solid ${K.line}` : undefined,
                opacity: s,
                transform: `translateY(${(1 - s) * 12}px)`,
              }}
            >
              <Mark mark={r.mark} i={i} />
              <span
                style={{
                  flex: 1,
                  fontWeight: 600,
                  fontSize: 25,
                  lineHeight: 1.2,
                }}
              >
                {r.text}
              </span>
              {r.value && (
                <span
                  style={{
                    position: "relative",
                    fontWeight: 700,
                    fontSize: 26,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    color: r.hl ? K.blue : K.ink,
                    background: r.hl ? K.tint : undefined,
                    padding: r.hl ? "4px 10px" : undefined,
                    borderRadius: 8,
                  }}
                >
                  <span style={{ opacity: 1 - 0.5 * struck }}>{r.value}</span>
                  <span
                    style={{
                      position: "absolute",
                      left: -4,
                      right: -4,
                      top: "50%",
                      height: 4,
                      marginTop: -2,
                      borderRadius: 2,
                      background: K.blue,
                      transform: `scaleX(${struck})`,
                      transformOrigin: "left center",
                    }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {item.result && (
        <ResultView
          r={item.result}
          start={rel(item.result.at, 0.4 + rows.length * 0.3)}
        />
      )}
      <Foot />
    </Shell>
  );
};

// Cena wyskakująca na białej plakietce w chwili, gdy pada (np. RingConn: 500–600 zł).
const PriceTag: React.FC<{ price: NonNullable<Side["price"]>; start: number }> = ({ price, start }) => {
  const { sp } = useT();
  const s = sp(start, { damping: 14, stiffness: 200 });
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        background: K.white,
        borderRadius: 12,
        padding: "10px 16px 12px",
        marginTop: 12,
        opacity: Math.min(1, s * 1.5),
        transform: `scale(${0.8 + 0.2 * s})`,
        transformOrigin: "left center",
      }}
    >
      <span style={{ fontFamily: K.mono, fontSize: 15, letterSpacing: "0.14em", textTransform: "uppercase", color: K.muted }}>{price.label}</span>
      <span style={{ fontWeight: 700, fontSize: 42, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 4, color: K.blue, whiteSpace: "nowrap" }}>{price.text}</span>
    </div>
  );
};

const Compare: React.FC = () => {
  const { item, rel, sp, ramp } = useT();
  const a = item.a!;
  const b = item.b!;
  const bAt = rel(b.at, 1.2);
  const s = sp(bAt);
  // keep: kontrast (sprzedawca / klient), nie „było → jest” — bez przekreślenia
  const struck = a.keep ? 0 : ramp(bAt, bAt + 0.4);
  return (
    <Shell>
      <div style={{ opacity: 1 - 0.45 * struck }}>
        <Label text={a.label} color={K.muted} />
        <div
          style={{
            position: "relative",
            display: "inline-block",
            marginTop: 10,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {a.title}
          </span>
          <span
            style={{
              position: "absolute",
              left: -4,
              right: -4,
              top: "52%",
              height: 4,
              borderRadius: 2,
              background: K.ink,
              transform: `scaleX(${struck})`,
              transformOrigin: "left center",
            }}
          />
        </div>
        {a.items?.map((x, i) => (
          <div
            key={i}
            style={{
              fontSize: 21,
              color: K.muted,
              marginTop: 6,
              lineHeight: 1.3,
            }}
          >
            {x}
          </div>
        ))}
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: K.blue,
          display: "grid",
          placeItems: "center",
          margin: "16px 0",
          transform: `scale(${s})`,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={K.white}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4v16M5 13l7 7 7-7" />
        </svg>
      </div>
      <div
        style={{
          background: K.tint,
          borderRadius: 16,
          padding: "18px 20px",
          opacity: s,
          transform: `translateY(${(1 - s) * 18}px)`,
        }}
      >
        <Label text={s > 0.05 ? b.label : ""} />
        <Logos
          logos={b.logos}
          h={b.logos?.[0]?.h ?? 32}
          top={12}
          start={bAt + 0.15}
        />
        {b.price && <PriceTag price={b.price} start={rel(b.price.at, bAt + 0.6)} />}
        <div
          style={{
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginTop: 10,
          }}
        >
          {b.title}
        </div>
        {b.items?.map((x, i) => (
          <div
            key={i}
            style={{
              fontWeight: 600,
              fontSize: 22,
              marginTop: 6,
              lineHeight: 1.3,
            }}
          >
            {x}
          </div>
        ))}
      </div>
      <Foot />
    </Shell>
  );
};

const Bars: React.FC = () => {
  const { item, rel, sp } = useT();
  const bars = item.bars ?? [];
  const max = item.max ?? Math.max(...bars.map((b) => b.value));
  const wide = item.zone === "C";
  const last = Math.max(...bars.map((b, i) => rel(b.at, 0.45 + i * 0.14)));
  return (
    <Shell width={wide ? 1100 : undefined}>
      <Label text={item.label} />
      <Title text={item.title} size={wide ? 44 : 38} />
      {bars.map((b, i) => {
        const s = sp(rel(b.at, 0.45 + i * 0.14), {
          damping: 26,
          stiffness: 110,
        });
        return (
          <div key={i} style={{ marginTop: wide ? 20 : 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: wide ? 24 : 22 }}>
                {b.label}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: wide ? 28 : 26,
                  color: b.hl ? K.blue : K.ink,
                  opacity: s,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {b.display}
              </span>
            </div>
            <div
              style={{
                height: wide ? 18 : 16,
                borderRadius: 9,
                background: K.gray,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(b.value / max) * 100 * s}%`,
                  borderRadius: 9,
                  background: b.hl ? K.blue : K.bar,
                }}
              />
            </div>
          </div>
        );
      })}
      {item.result && (
        <ResultView
          r={item.result}
          start={rel(item.result.at, last + 0.7)}
          size={wide ? 88 : 76}
        />
      )}
      <Foot />
    </Shell>
  );
};

const Counter: React.FC = () => {
  const { item, t } = useT();
  const v = interpolate(t, [0.25, 1.4], [0, item.to ?? 0], {
    ...clamp,
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });
  return (
    <Shell>
      <Label text={item.label} />
      <Logos logos={item.logos} h={40} top={16} start={0.2} />
      <div
        style={{
          fontWeight: 700,
          fontSize: 112,
          letterSpacing: "-0.045em",
          lineHeight: 1,
          color: K.blue,
          marginTop: 14,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {fmt(v, item.decimals)}
        {item.suffix}
      </div>
      {item.unit && (
        <div
          style={{
            fontWeight: 600,
            fontSize: 26,
            lineHeight: 1.25,
            marginTop: 10,
          }}
        >
          {item.unit}
        </div>
      )}
      {item.sub && (
        <div
          style={{
            fontSize: 21,
            color: K.muted,
            lineHeight: 1.3,
            marginTop: 6,
          }}
        >
          {item.sub}
        </div>
      )}
      <Foot />
    </Shell>
  );
};

const Flow: React.FC = () => {
  const { item, rel, sp, ramp } = useT();
  const nodes = item.nodes ?? [];
  const at = (i: number) => rel(nodes[i].at, 0.4 + i * 0.5);
  return (
    <Shell>
      <Label text={item.label} />
      <Title text={item.title} />
      <div style={{ marginTop: 20 }}>
        {nodes.map((n, i) => {
          const s = sp(at(i), { damping: 16, stiffness: 190 });
          const line =
            i < nodes.length - 1 ? ramp(at(i + 1) - 0.4, at(i + 1)) : 0;
          const done = n.icon === "check";
          return (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 18,
                paddingBottom: i < nodes.length - 1 ? 26 : 0,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: done ? K.blue : K.tint,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  opacity: s,
                  transform: `scale(${0.6 + 0.4 * s})`,
                }}
              >
                <Icon
                  name={n.icon}
                  size={28}
                  color={done ? K.white : n.icon === "x" ? K.muted : K.blue}
                  width={done ? 3 : 2}
                />
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 24,
                  lineHeight: 1.25,
                  opacity: s,
                  transform: `translateX(${(1 - s) * 12}px)`,
                }}
              >
                {n.text}
              </div>
              {i < nodes.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 25.5,
                    top: 58,
                    bottom: 4,
                    width: 3,
                    borderRadius: 2,
                    background: K.line,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${line * 100}%`,
                      background: K.blue,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Foot />
    </Shell>
  );
};

const MONTHS = [
  "STY",
  "LUT",
  "MAR",
  "KWI",
  "MAJ",
  "CZE",
  "LIP",
  "SIE",
  "WRZ",
  "PAŹ",
  "LIS",
  "GRU",
];
const Calendar: React.FC = () => {
  const { item, rel, sp, ramp } = useT();
  const m = item.months ?? {};
  const onAt = rel(m.onAt, 0.8);
  const on = ramp(onAt, onAt + 0.3);
  const planesAt = rel(m.planesAt, 0.8);
  const cap = ramp(rel(item.captionAt, 1.6), rel(item.captionAt, 1.6) + 0.5);
  return (
    <Shell>
      <Label text={item.label} />
      <Title text={item.title} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
          marginTop: 20,
        }}
      >
        {MONTHS.map((name, k) => {
          const active = m.on?.includes(k);
          const today = m.today === k;
          const plane = m.planes?.indexOf(k) ?? -1;
          const ps =
            plane >= 0
              ? sp(planesAt + plane * 0.14, { damping: 14, stiffness: 200 })
              : 0;
          return (
            <div
              key={k}
              style={{
                position: "relative",
                height: 66,
                borderRadius: 10,
                background: active
                  ? interpolateColors(on, [0, 1], [K.gray, K.blue])
                  : today
                    ? K.white
                    : K.gray,
                boxShadow: today ? `inset 0 0 0 3px ${K.blue}` : undefined,
                opacity: m.on && !active ? 1 - 0.45 * on : 1,
                transform: active
                  ? `scale(${1 + 0.08 * Math.sin(on * Math.PI)})`
                  : undefined,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: K.mono,
                  fontSize: 16,
                  letterSpacing: "0.08em",
                  color:
                    active && on > 0.5 ? K.white : today ? K.blue : K.muted,
                }}
              >
                {name}
              </span>
              {today && (
                <span style={{ fontWeight: 700, fontSize: 13, color: K.blue }}>
                  3 dni
                </span>
              )}
              {plane >= 0 && (
                <span
                  style={{
                    opacity: ps,
                    transform: `scale(${0.5 + 0.5 * ps}) rotate(${(1 - ps) * -30}deg)`,
                  }}
                >
                  <Icon name="plane" size={22} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {item.caption && (
        <div
          style={{
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
            marginTop: 20,
            opacity: Math.min(1, cap * 2),
          }}
        >
          <Marked text={item.caption} p={cap} />
        </div>
      )}
      <Foot />
    </Shell>
  );
};

const Statement: React.FC = () => {
  const { item, rel, ramp } = useT();
  const hl = rel(item.hlAt, 0.6);
  return (
    <Shell>
      <Label text={item.label} />
      <div
        style={{
          fontWeight: 700,
          fontSize: 46,
          letterSpacing: "-0.03em",
          lineHeight: 1.18,
          marginTop: 14,
        }}
      >
        <Marked text={item.text ?? ""} p={ramp(hl, hl + 0.45)} />
      </div>
    </Shell>
  );
};

const Photo: React.FC = () => {
  const { item, base, t, sp } = useT();
  const s = sp(0.05, { damping: 16, stiffness: 140 });
  const tag = sp(0.35, { damping: 15, stiffness: 190 });
  return (
    <Shell bare width={584}>
      <div
        style={{
          position: "relative",
          background: K.white,
          padding: 12,
          borderRadius: 18,
          transform: `rotate(${interpolate(s, [0, 1], [-6, -2])}deg) scale(${0.86 + 0.14 * s})`,
          opacity: Math.min(1, s * 1.6),
        }}
      >
        <div style={{ height: 360, borderRadius: 10, overflow: "hidden" }}>
          <Img
            src={staticFile(`${base}/photos/${item.src}`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${interpolate(t, [0, item.dur], [1.1, 1])})`,
            }}
          />
        </div>
        {item.tag && (
          <div
            style={{
              position: "absolute",
              left: 28,
              bottom: -22,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: K.blue,
              color: K.white,
              fontFamily: K.mono,
              fontSize: 15,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "11px 18px",
              borderRadius: 100,
              opacity: tag,
              transform: `translateY(${(1 - tag) * 12}px)`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: K.white,
              }}
            />
            {item.tag}
          </div>
        )}
      </div>
    </Shell>
  );
};

const Cta: React.FC = () => {
  const { item, t, rel } = useT();
  const pr = rel(item.pressAt, 1.2);
  const bump = interpolate(t, [pr, pr + 0.08, pr + 0.32], [0, 1, 0], clamp);
  const cur = interpolate(t, [pr - 0.7, pr], [1, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const code = !item.button && item.pressAt != null;
  return (
    <Shell width={item.text ? undefined : "auto"}>
      <Label text={item.label} />
      <Logos logos={item.logos} h={34} top={16} />
      {item.text && (
        <div
          style={{
            display: code ? "inline-block" : "block",
            fontWeight: 700,
            fontSize: code ? 56 : item.button ? 30 : 42,
            letterSpacing: code ? "0.06em" : "-0.03em",
            lineHeight: 1.1,
            marginTop: 14,
            color: code ? K.blue : K.ink,
            background: code ? K.tint : undefined,
            padding: code ? "12px 22px" : undefined,
            borderRadius: 14,
            transform: code ? `scale(${1 - 0.05 * bump})` : undefined,
          }}
        >
          {item.text}
        </div>
      )}
      {item.sub && (
        <div
          style={{
            fontWeight: 600,
            fontSize: 22,
            color: K.muted,
            lineHeight: 1.3,
            marginTop: 10,
          }}
        >
          {item.sub}
        </div>
      )}
      {item.button && (
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: K.blue,
              color: K.white,
              fontWeight: 700,
              fontSize: 26,
              padding: "15px 28px",
              borderRadius: 100,
              transform: `scale(${1 - 0.07 * bump})`,
            }}
          >
            {item.icon && <Icon name={item.icon} size={26} color={K.white} />}
            {item.button}
          </div>
          {/* kursor dojeżdża do przycisku i klika */}
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              right: 18 - cur * 40,
              bottom: -18 - cur * 36,
              opacity: 1 - cur * 0.9,
            }}
          >
            <path
              d="M4 2.5 19 12l-6.6 1.4L16 20l-2.6 1.3-3.5-6.7L4 19z"
              fill={K.white}
              stroke={K.ink}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <Foot />
    </Shell>
  );
};

const Line: React.FC = () => {
  const { item, rel, sp, ramp } = useT();
  const s = item.series!;
  const W = 496;
  const H = 210;
  const top = s.per * s.months;
  const x = (mo: number) => (mo / s.months) * W;
  const y = (v: number) => H - (v / top) * H;
  const d = ramp(0.45, 2.3, Easing.inOut(Easing.cubic));
  const cross = s.fixed / s.per;
  const cs = sp(rel(item.crossAt, 2.3), { damping: 13, stiffness: 200 });
  const cap = ramp(rel(item.crossAt, 2.3) + 0.2, rel(item.crossAt, 2.3) + 0.7);
  return (
    <Shell>
      <Label text={item.label} />
      <Title text={item.title} />
      <svg
        width={W}
        height={H + 34}
        style={{ marginTop: 22, overflow: "visible" }}
      >
        <line
          x1={0}
          y1={y(s.fixed)}
          x2={W * d}
          y2={y(s.fixed)}
          stroke={K.bar}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={H}
          x2={x(s.months * d)}
          y2={y(top * d)}
          stroke={K.blue}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <text
          x={x(s.months * d) - 6}
          y={y(top * d) - 14}
          textAnchor="end"
          fontFamily={K.font}
          fontWeight={700}
          fontSize={23}
          fill={K.blue}
          opacity={d}
        >
          {s.perLabel}
        </text>
        <text
          x={W * d}
          y={y(s.fixed) + 30}
          textAnchor="end"
          fontFamily={K.font}
          fontWeight={600}
          fontSize={22}
          fill={K.muted}
          opacity={d}
        >
          {s.fixedLabel}
        </text>
        <circle
          cx={x(cross)}
          cy={y(s.fixed)}
          r={11 * cs}
          fill={K.blue}
          stroke={K.white}
          strokeWidth={4}
        />
        {[0, s.months / 2, s.months].map((mo) => (
          <text
            key={mo}
            x={x(mo)}
            y={H + 30}
            textAnchor={mo ? (mo === s.months ? "end" : "middle") : "start"}
            fontFamily={K.mono}
            fontSize={15}
            letterSpacing="0.08em"
            fill={K.muted}
          >
            {mo === s.months ? `${mo} MIES.` : mo}
          </text>
        ))}
      </svg>
      {item.caption && (
        <div
          style={{
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "-0.02em",
            marginTop: 14,
            opacity: Math.min(1, cap * 2),
          }}
        >
          <Marked text={item.caption} p={cap} />
        </div>
      )}
    </Shell>
  );
};

const Grid: React.FC = () => {
  const { item, sp } = useT();
  return (
    <Shell width={1500}>
      <Label text={item.label} />
      <Title text={item.title} size={44} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          columnGap: 40,
          marginTop: 18,
        }}
      >
        {(item.grid ?? []).map((g, i) => {
          const s = sp(0.4 + i * 0.035);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "baseline",
                padding: "12px 0",
                borderTop: `2px solid ${K.line}`,
                opacity: s,
                transform: `translateY(${(1 - s) * 10}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: K.mono,
                  fontSize: 16,
                  color: K.blue,
                  width: 26,
                  flexShrink: 0,
                }}
              >
                {pad(i + 1)}
              </span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {g.name}
                </div>
                <div style={{ fontSize: 19, color: K.muted, marginTop: 2 }}>
                  {g.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
};

const LogosOnly: React.FC = () => {
  const { item, rel, sp } = useT();
  const right = item.zone === "R";
  const cap = sp(0.02);
  return (
    <Shell bare width={620}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: right ? "flex-end" : "flex-start",
          gap: 12,
        }}
      >
        {item.caption && (
          <div
            style={{
              background: K.white,
              borderRadius: 100,
              padding: "10px 18px",
              opacity: cap,
              transform: `translateY(${(1 - cap) * 10}px)`,
            }}
          >
            <Label text={item.caption} />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: right ? "flex-end" : "flex-start",
          }}
        >
          {(item.logos ?? []).map((l, i) => {
            const s = sp(rel(l.at, 0.25 + i * 0.25), {
              damping: 14,
              stiffness: 170,
            });
            return (
              <div
                key={i}
                style={{
                  background: K.white,
                  borderRadius: 18,
                  padding: "16px 22px",
                  minHeight: 76,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  opacity: Math.min(1, s * 1.5),
                  transform: `scale(${0.6 + 0.4 * s})`,
                  transformOrigin: right ? "right center" : "left center",
                }}
              >
                <LogoView l={l} h={l.h ?? 40} />
                {l.sub && (
                  <div style={{ fontSize: 19, color: K.muted, marginTop: 6 }}>
                    {l.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
};

const Notify: React.FC = () => {
  const { item, sp } = useT();
  const s = sp(0.02, { damping: 18, stiffness: 160 });
  return (
    <Shell bare>
      <div
        style={{
          display: "flex",
          gap: 16,
          background: K.white,
          borderRadius: 26,
          padding: "18px 20px",
          transform: `translateY(${(1 - s) * -60}px)`,
          opacity: s,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 12,
            background: K.blue,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="calendar" size={28} color={K.white} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 17,
              fontWeight: 600,
              color: K.muted,
            }}
          >
            <span>{item.app}</span>
            <span>teraz</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 23, marginTop: 2 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 21, lineHeight: 1.3, marginTop: 2 }}>
            {item.text}
          </div>
        </div>
      </div>
    </Shell>
  );
};


// iPhone (proporcje ekranu z nagrania 1206×2622) po lewej stronie kadru. Kwota w nagraniu dostaje niebieskie podświetlenie,
// które jedzie za przewijaną ofertą, a obok wyskakuje karta z kierunkiem i odliczaną ceną, połączona z kwotą linią.
// Karty stoją poniżej brody Kacpra (środek y ≥ 600), linia schodzi do nich ukosem.
const PH = { left: 64, top: 70, h: 940, bezel: 12 };
const CARD_Y: [number, number] = [600, 880];
const cyAt = (h: Highlight, vt: number) => {
  const p = h.pts;
  if (vt <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++)
    if (vt <= p[i][0]) {
      const [t0, c0] = p[i - 1];
      const [t1, c1] = p[i];
      return c0 + ((c1 - c0) * (vt - t0)) / (t1 - t0);
    }
  return p[p.length - 1][1];
};
const Phone: React.FC = () => {
  const { item, base, t, sp, ramp } = useT();
  const sh = PH.h - 2 * PH.bezel;
  const sw = sh * (1206 / 2622);
  const W = sw + 2 * PH.bezel;
  const sx = PH.left + PH.bezel;
  const sy = PH.top + PH.bezel;
  const cardLeft = PH.left + W + 34;
  const enter = sp(0, { damping: 20, stiffness: 110, mass: 1 });
  const out = ramp(item.dur - 0.45, item.dur, Easing.in(Easing.cubic));
  const lift = (1 - enter) * 200 + out * 240 + Math.sin(t * 1.2) * 3;
  const chip = sp(0.55, { damping: 16, stiffness: 180 });
  const active = (item.highlights ?? []).filter((h) => t >= h.start - 0.05 && t <= h.end + 0.4);
  return (
    <AbsoluteFill style={{ fontFamily: K.font, color: K.ink }}>
      <AbsoluteFill
        style={{
          transform: `translateY(${lift}px) rotate(${(1 - enter) * -3}deg)`,
          transformOrigin: `${PH.left + W / 2}px ${PH.top + PH.h}px`,
          opacity: Math.min(1, enter * 2) * (1 - out),
        }}
      >
        {/* obudowa: ciemny tytan, przyciski na bokach */}
        <div
          style={{
            position: "absolute",
            left: PH.left,
            top: PH.top,
            width: W,
            height: PH.h,
            borderRadius: 74,
            background: "#1C1C1E",
            boxShadow: "inset 0 0 0 2px #55555A, inset 0 0 0 6px #0E0E10, 0 34px 60px rgba(20,20,20,0.38), 0 6px 14px rgba(20,20,20,0.25)",
          }}
        />
        {[
          [-3, 150, 34],
          [-3, 212, 64],
          [-3, 292, 64],
          [W - 2, 250, 104],
          [W - 2, 520, 62],
        ].map(([x, y, h], i) => (
          <div key={i} style={{ position: "absolute", left: PH.left + x, top: PH.top + y, width: 5, height: h, borderRadius: 3, background: "#2E2E31" }} />
        ))}
        <div style={{ position: "absolute", left: sx, top: sy, width: sw, height: sh, borderRadius: 62, overflow: "hidden", background: "#000" }}>
          <OffthreadVideo src={staticFile(`${base}/${item.src}`)} muted style={{ width: "100%", height: "100%", display: "block" }} />
          {active.map((h) => {
            const s = sp(h.start, { damping: 18, stiffness: 200 });
            const o = ramp(h.end, h.end + 0.3);
            const bw = h.box.w * sw + 18;
            const bh = h.box.h * sh + 12;
            return (
              <div
                key={h.start}
                style={{
                  position: "absolute",
                  left: h.box.x * sw - 9,
                  top: cyAt(h, t) * sh - bh / 2,
                  width: bw,
                  height: bh,
                  borderRadius: 8,
                  border: `3px solid ${K.blue}`,
                  background: "rgba(6,111,237,0.24)",
                  boxShadow: "0 0 0 5px rgba(6,111,237,0.22), 0 0 22px rgba(6,111,237,0.7)",
                  transform: `scaleX(${s})`,
                  transformOrigin: "left center",
                  opacity: 1 - o,
                }}
              />
            );
          })}
          {/* zasłony: pasek statusu (godzina, kropka nagrywania) i dolna stopka WhatsAppa — w kolorze tła aplikacji */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: sh * 0.058, background: "#141414" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: sh * 0.1, background: "#131313" }} />
          {/* Dynamic Island */}
          <div style={{ position: "absolute", top: 11, left: "50%", width: 132, height: 38, marginLeft: -66, borderRadius: 19, background: "#000" }} />
        </div>
        {/* linie od kwoty do karty */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {active.map((h) => {
            const o = ramp(h.end, h.end + 0.3);
            const line = ramp(h.start + 0.05, h.start + 0.45);
            const x1 = sx + (h.box.x + h.box.w) * sw + 9;
            const y1 = sy + cyAt(h, t) * sh;
            const y2 = Math.min(Math.max(y1, CARD_Y[0]), CARD_Y[1]);
            const len = Math.hypot(cardLeft - x1, y2 - y1);
            return (
              <g key={h.start} opacity={1 - o}>
                <circle cx={x1} cy={y1} r={5} fill={K.blue} />
                <line x1={x1} y1={y1} x2={cardLeft} y2={y2} stroke={K.blue} strokeWidth={3} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - line)} />
              </g>
            );
          })}
        </svg>
        {active.map((h) => {
          const s = sp(h.start + 0.15, { damping: 16, stiffness: 190 });
          const o = ramp(h.end, h.end + 0.3, Easing.in(Easing.cubic));
          const y = Math.min(Math.max(sy + cyAt(h, t) * sh, CARD_Y[0]), CARD_Y[1]);
          const [, od, num] = h.price.match(/^(od\s)?(.*)$/) ?? [];
          const to = Number(num.replace(/\D/g, ""));
          const v = interpolate(t - h.start - 0.15, [0, 0.55], [0, to], { ...clamp, easing: Easing.bezier(0.25, 1, 0.5, 1) });
          return (
            <div
              key={h.start}
              style={{
                position: "absolute",
                left: cardLeft,
                top: y,
                transform: `translate(${(1 - s) * -18 + o * 12}px, -50%) scale(${0.86 + 0.14 * s})`,
                transformOrigin: "left center",
                opacity: Math.min(1, s * 1.6) * (1 - o),
                background: K.white,
                borderRadius: 18,
                padding: "14px 22px 16px",
                filter: K.shadow,
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: K.mono, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", color: K.blue }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: K.blue }} />
                {h.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                {od && <span style={{ fontWeight: 600, fontSize: 26, color: K.muted }}>od</span>}
                <span style={{ fontWeight: 700, fontSize: 50, letterSpacing: "-0.04em", lineHeight: 1, color: K.blue, fontVariantNumeric: "tabular-nums" }}>
                  {`${fmt(v)}\u00a0zł`}
                </span>
              </div>
            </div>
          );
        })}
        {/* metka marki pod kartami */}
        <div
          style={{
            position: "absolute",
            left: cardLeft,
            top: PH.top + PH.h - 66,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: K.white,
            borderRadius: 100,
            padding: "10px 20px",
            filter: K.shadow,
            opacity: chip,
            transform: `translateY(${(1 - chip) * 12}px)`,
          }}
        >
          {item.logos?.[0] && <LogoView l={item.logos[0]} h={item.logos[0].h ?? 30} />}
          {item.caption && <span style={{ fontFamily: K.mono, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", color: K.blue }}>{item.caption}</span>}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const VIEWS: Record<Item["type"], React.FC> = {
  chapter: Chapter,
  logos: LogosOnly,
  rows: Rows,
  compare: Compare,
  bars: Bars,
  counter: Counter,
  flow: Flow,
  calendar: Calendar,
  statement: Statement,
  photo: Photo,
  cta: Cta,
  line: Line,
  grid: Grid,
  notify: Notify,
  phone: Phone,
};

// SFX do zdarzeń na ekranie (pliki już 10 dB pod głosem): wejście = whoosh/pop, kwoty = kasa, kliknięcia = klik.
export const sfxOf = (it: Item) => {
  const r = (a: number | undefined, d: number) => (a == null ? d : a - it.at);
  const L: { at: number; s: string }[] = [];
  const add = (at: number, s: string) => L.push({ at: Math.max(0, at), s });
  const rows = it.rows ?? [];
  switch (it.type) {
    case "chapter":
      add(0, "whoosh");
      it.logos?.forEach((l, i) => add(r(l.at, 0.3 + i * 0.18) + 0.04, "pop"));
      break;
    case "logos":
      it.logos?.forEach((l, i) =>
        add(r(l.at, 0.25 + i * 0.25), i % 2 ? "pop2" : "pop"),
      );
      break;
    case "rows":
      add(0, "whoosh2");
      rows.forEach(
        (row) => row.strike != null && add(r(row.strike, 0), "slide"),
      );
      if (it.result)
        add(
          r(it.result.at, 0.4 + rows.length * 0.3) + 0.85,
          it.result.cash ? "cash" : "ding",
        );
      if (it.cashAt != null) add(r(it.cashAt, 0), "cash");
      break;
    case "compare":
      add(0, "whoosh2");
      add(r(it.b?.at, 1.2), "whoosh-fast");
      if (it.b?.price) add(r(it.b.price.at, r(it.b?.at, 1.2) + 0.6) + 0.1, "cash");
      break;
    case "bars": {
      add(0, "whoosh2");
      const last = Math.max(
        ...(it.bars ?? []).map((b, i) => r(b.at, 0.45 + i * 0.14)),
      );
      if (it.result) add(r(it.result.at, last + 0.7) + 0.85, "cash");
      else add(last + 0.5, "pop");
      break;
    }
    case "counter":
      add(0, "whoosh2");
      add(1.35, "ding");
      break;
    case "flow":
      add(0, "whoosh2");
      it.nodes?.forEach((n, i) => add(r(n.at, 0.4 + i * 0.5), "click"));
      break;
    case "calendar":
      add(0, "whoosh2");
      if (it.months?.onAt != null) add(r(it.months.onAt, 0.8), "confirm");
      if (it.months?.planesAt != null) add(r(it.months.planesAt, 0.8), "pop");
      break;
    case "statement":
      add(0, "whoosh");
      add(r(it.hlAt, 0.6), "slide");
      break;
    case "photo":
      add(0, "whoosh2");
      add(0.3, "pop");
      break;
    case "cta":
      add(0, "pop");
      if (it.pressAt != null) add(r(it.pressAt, 1.2), "click");
      break;
    case "line":
      add(0, "whoosh2");
      add(r(it.crossAt, 2.3), "ding");
      break;
    case "grid":
      add(0, "whoosh");
      add(0.4 + 17 * 0.035 + 0.2, "confirm");
      break;
    case "notify":
      add(0.05, "notify");
      break;
    case "phone":
      add(0.05, "whoosh");
      // na przemian kasa (gdy cena doliczy się do końca) i pop przy wejściu karty
      it.highlights?.forEach((h, i) => add(i % 2 ? h.start + 0.15 : h.start + 0.6, i % 2 ? "pop" : "cash"));
      break;
  }
  // Pop/kasa nie częściej niż co ~0,45 s; nic po końcu klipu.
  const out: typeof L = [];
  for (const x of [...L, ...(it.sfx ?? [])].sort((a, b) => a.at - b.at)) {
    const prev = out[out.length - 1];
    if (x.at > it.dur - 0.3) continue;
    if (
      prev &&
      x.at - prev.at < 0.45 &&
      /pop|cash/.test(x.s) &&
      /pop|cash/.test(prev.s)
    )
      continue;
    out.push(x);
  }
  return out;
};

// Kwoty w jednym kawałku („1 000 zł”) i bez samosiek: krótkie spójniki/przyimki sklejone z następnym słowem.
const nb = (s: string) =>
  s
    .replace(/(\d) (?=\d{3}\b)/g, "$1\u00a0")
    .replace(/(\d) (?=(zł|€|\$|%|TB|GB|mies|dni|osób|kont|lot))/g, "$1\u00a0")
    .replace(
      /(^|[\s\u00a0])([aiouwzAIOUWZ]|do|na|od|po|za|ze|we|×|÷|≈|−|\+) /g,
      "$1$2\u00a0",
    );
const tidy = <T,>(v: T): T =>
  (typeof v === "string"
    ? nb(nb(v))
    : Array.isArray(v)
      ? v.map(tidy)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v).map(([k, x]) => [k, k === "src" ? x : tidy(x)]),
          )
        : v) as T;

const FONTS = [{ family: "Inter", file: "fonts/Inter.ttf", weight: "100 900" }];
export const PackItem: React.FC<{ item: Item; base: string }> = ({
  item: raw,
  base,
}) => {
  const item = React.useMemo(() => tidy(raw), [raw]);
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = delayRender("fonty");
    loadFonts(FONTS)
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [delayRender, continueRender, cancelRender]);
  const View = VIEWS[item.type];
  return (
    <Ctx.Provider value={{ item, base }}>
      {ready && <View />}
      {sfxOf(item).map((x, i) => (
        <Sequence key={i} from={Math.round(x.at * fps)} layout="none">
          <Audio src={staticFile(`${base}/sfx/${x.s}.wav`)} />
        </Sequence>
      ))}
    </Ctx.Provider>
  );
};
