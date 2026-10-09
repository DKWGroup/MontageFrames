import { fitText } from "@remotion/layout-utils";
import {
  Audio,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AMERYKA } from "./ameryka";
import {
  kineticCaptions,
  kineticOverlay,
  type OverlayProps,
  type Theme,
} from "./bisanz";

// GlowUp Nutrition (nutriglowup.pl): silnik ruchu Bisanza, klucz Bebas Neue na czerwonym zakreślaczu,
// małe słowa Poppins 600. Grafiki jak sekcje strony: płaska czerń, radius 4/2 px, linie 1 px,
// eyebrow w czerwieni, liczby Bebas. Zasady i kontrasty: klienci/glowup-nutrition/PREFERENCJE.md
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const RED = "#E63A46"; // biel na czerwonym tylko duży tekst (4,15:1)
const WINE = "#2F1A1B";
const MUTED = "#A0A0A0";
const LINE = "rgba(255,255,255,0.10)";
const BEBAS = "'Bebas Neue', sans-serif";
const POPPINS = "Poppins, sans-serif";

export const GLOWUP: Theme = {
  ...AMERYKA,
  font: POPPINS,
  keyFont: BEBAS,
  keySpacing: "0.02em",
  label: { font: POPPINS, size: 26, spacing: "0.15em" },
  text: WHITE,
  accent: RED,
  onAccent: WHITE,
  glow: "230,58,70",
  shade: "10,10,10",
  card: BLACK,
  cardText: WHITE,
  cardBorder: LINE,
  cardLine: LINE,
  pill: BLACK,
  pillText: WHITE,
  labelShadow: "0 2px 10px rgba(10,10,10,0.85)",
  keyWeight: 400,
  smallWeight: 600,
  keySize: 150, // Bebas jest wąski: ~1,25× klucza Ameryki
  smallSize: 52,
  inlineKey: 112,
  inlineSmall: 52,
  shadow: "0 6px 22px rgba(10,10,10,0.6), 0 2px 4px rgba(10,10,10,0.7)",
  y: 0.73,
  // Karty stoją dolną krawędzią na 0,75 (strefa TikToka), więc napis nad kartą wyżej niż w Ameryce.
  yRaised: 0.5,
  radius: 4,
  ctaRadius: 4,
  marker: { key: [RED, WHITE], hl: [WINE, WHITE], hlWeight: 600, hlPop: true },
};

export const Glowup = kineticCaptions(GLOWUP);
const Base = kineticOverlay(GLOWUP);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BOTTOM = 0.75;
const expo = Easing.out(Easing.exp);

// Wejście 0,5 s z wygaszaniem wykładniczym i krótką smugą (motion blur marki); wyjście szybsze.
const useMotion = (dur: number) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(f, [0, 0.5 * fps], [0, 1], {
    ...clamp,
    easing: expo,
  });
  const exit = interpolate(f, [dur - 8, dur], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  return { f, fps, enter, exit };
};
// Postęp elementu startującego `t` sekund po wejściu grafiki (0..1, ease-out expo).
const ease = (f: number, fps: number, t: number, len = 0.45) =>
  interpolate(f, [t * fps, (t + len) * fps], [0, 1], {
    ...clamp,
    easing: expo,
  });

const Eyebrow: React.FC<{ children: React.ReactNode; draw: number }> = ({
  children,
  draw,
}) => (
  <div style={{ marginBottom: 22 }}>
    <div
      style={{
        fontFamily: POPPINS,
        fontWeight: 600,
        fontSize: 26,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: RED,
      }}
    >
      {children}
    </div>
    <div
      style={{
        marginTop: 14,
        width: 90,
        height: 3,
        background: RED,
        transform: `scaleX(${draw})`,
        transformOrigin: "left",
      }}
    />
  </div>
);

// Plakietka dawki jak „500 MG W PORCJI DZIENNEJ”: obrys 1 px, czerwony tekst, radius 2 px.
const Badge: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 26,
}) => (
  <span
    style={{
      display: "inline-block",
      padding: "8px 14px 6px",
      border: `1px solid ${RED}`,
      background: "rgba(230,58,70,0.12)",
      borderRadius: 2,
      color: RED,
      fontFamily: POPPINS,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

// Halftone z czerwonych kwadratów schodzący gradientem w rogu karty (ozdobnik marki).
const Halftone: React.FC<{ show: number }> = ({ show }) => (
  <div
    style={{
      position: "absolute",
      right: 18,
      top: 18,
      display: "grid",
      gridTemplateColumns: "repeat(7, 22px)",
      gap: 4,
      opacity: 0.55 * show,
    }}
  >
    {Array.from({ length: 49 }, (_, i) => {
      const s = Math.max(0, 1 - (6 - (i % 7) + Math.floor(i / 7)) / 7) * show;
      return (
        <div
          key={i}
          style={{
            width: 22,
            height: 22,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ width: 20 * s, height: 20 * s, background: RED }} />
        </div>
      );
    })}
  </div>
);

// Podpis źródła danych (PREFERENCJE klienta: każda statystyka i badanie ze źródłem).
const Source: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      marginTop: 22,
      fontFamily: POPPINS,
      fontWeight: 400,
      fontSize: 20,
      letterSpacing: "0.02em",
      color: MUTED,
    }}
  >
    Źródło: {children}
  </div>
);

const Card: React.FC<{
  o: OverlayProps["o"];
  enter: number;
  exit: number;
  children: React.ReactNode;
  src: OverlayProps["src"];
}> = ({ o, enter, exit, children, src }) => {
  const { width, height } = useVideoConfig();
  const fade = Math.min(enter * 1.5, 1 - exit);
  return (
    <>
      {/* dim: dane na cały kadr — wideo prawie znika, napisy zostają na swojej wysokości */}
      {o.dim && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,10,10,0.92)",
            opacity: fade,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: (o.x ?? 0.5) * width,
          ...(o.y != null
            ? { top: o.y * height }
            : { bottom: height * (1 - BOTTOM) }),
          width: width * 0.78,
          transform: `translate(-50%, ${o.y != null ? -50 : 0}%) translateY(${(1 - enter) * 70 + exit * 30}px)`,
          filter: enter < 0.97 ? `blur(${(1 - enter) * 12}px)` : undefined,
          opacity: fade,
          background: o.h || o.dim ? BLACK : "rgba(10,10,10,0.94)",
          border: `1px solid ${LINE}`,
          borderRadius: 4,
          boxShadow: "0 30px 70px rgba(10,10,10,0.45)",
          padding: "40px 46px",
          boxSizing: "border-box",
          ...(o.h && {
            minHeight: o.h * height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }),
          overflow: o.type === "product" ? "visible" : "hidden",
          color: WHITE,
          fontFamily: POPPINS,
        }}
      >
        {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
        {o.logo && o.type !== "product" && <Logo file={src(o.logo)} h={52} />}
        {children}
        {o.source && <Source>{o.source}</Source>}
      </div>
    </>
  );
};

// „Anatomia formuły”: numer · nazwa (Bebas) · dawka (`badge`, Bebas w czerwieni) · forma (`sub`), linie 1 px.
// mark "flow": łańcuch A → B → C (np. testosteron → aromataza → estrogen), ogniwo z `badge` jako plakietka.
const List: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const flow = o.mark === "flow";
  const items = (o.items ?? []).map((it, i) =>
    typeof it === "string"
      ? { text: it, t: 0.3 + i * 0.12 }
      : { ...it, t: it.at != null ? at(it.at) : 0.3 + i * 0.12 },
  );
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      {o.title && <Eyebrow draw={ease(f, fps, 0.25, 0.6)}>{o.title}</Eyebrow>}
      {items.map((it, i) => {
        const p = ease(f, fps, it.t);
        return (
          <div key={i}>
            {flow && i > 0 && (
              // strzałka rysuje się w dół do kolejnego ogniwa
              <div
                style={{
                  marginLeft: 24,
                  height: 46,
                  width: 3,
                  background: RED,
                  transform: `scaleY(${p})`,
                  transformOrigin: "top",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -9,
                    bottom: -4,
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderTop: `14px solid ${RED}`,
                    opacity: p > 0.9 ? 1 : 0,
                  }}
                />
              </div>
            )}
            {!flow && i > 0 && (
              <div
                style={{
                  height: 1,
                  background: LINE,
                  transform: `scaleX(${ease(f, fps, it.t + 0.1, 0.5)})`,
                  transformOrigin: "left",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 22,
                padding: flow ? "6px 0" : "14px 0",
                opacity: p,
                transform: `translateX(${(1 - p) * 40}px)`,
                filter: p < 0.95 ? `blur(${(1 - p) * 8}px)` : undefined,
              }}
            >
              {!flow && (
                <span
                  style={{
                    fontFamily: BEBAS,
                    fontSize: 40,
                    color: RED,
                    letterSpacing: "0.04em",
                    minWidth: 46,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {flow && it.badge ? (
                  <Badge size={40}>{it.text}</Badge>
                ) : (
                  <div
                    style={{
                      fontFamily: BEBAS,
                      fontSize: flow ? 110 : 66,
                      lineHeight: 0.95,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    {it.text}
                  </div>
                )}
                {it.sub && (
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 400,
                      color: MUTED,
                      marginTop: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {it.sub}
                  </div>
                )}
              </div>
              {!flow && it.badge && (
                <span
                  style={{
                    fontFamily: BEBAS,
                    fontSize: 64,
                    color: RED,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
};

// Liczba-bohater (`counter`): Bebas do 300 px, jednostka w ⅓ wielkości, plakietka, halftone w rogu.
const Dose: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width } = useVideoConfig();
  const to = o.to ?? 0;
  const v = interpolate(f / fps, [0.15, 1.1], [o.from ?? to, to], {
    ...clamp,
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });
  const size = Math.min(
    o.size ?? 300,
    fitText({
      text: `${o.prefix ?? ""}${to}`,
      withinWidth: width * 0.78 - 92 - 200,
      fontFamily: BEBAS,
      validateFontIsLoaded: false,
    }).fontSize,
  );
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      <Halftone show={ease(f, fps, 0.3, 0.8)} />
      {o.title && <Eyebrow draw={ease(f, fps, 0.25, 0.6)}>{o.title}</Eyebrow>}
      <div
        style={{
          fontFamily: BEBAS,
          fontSize: size,
          lineHeight: 0.85,
          letterSpacing: "0.01em",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {o.prefix}
        {v.toFixed(o.decimals ?? 0).replace(".", ",")}
        {o.suffix && (
          <span
            style={{
              fontSize: size / 3,
              color: RED,
              marginLeft: 14,
              letterSpacing: "0.04em",
            }}
          >
            {o.suffix}
          </span>
        )}
      </div>
      {o.label && (
        <div style={{ marginTop: 26, opacity: ease(f, fps, 0.6) }}>
          <Badge>{o.label}</Badge>
        </div>
      )}
      {o.text && (
        <div
          style={{
            marginTop: 18,
            fontSize: 26,
            color: MUTED,
            lineHeight: 1.35,
            opacity: ease(f, fps, 0.75),
          }}
        >
          {o.text}
        </div>
      )}
    </Card>
  );
};

// Paski bez osi i siatki: wyróżniony czerwony, reszta wino, wartość Bebas przy końcu paska.
const Bars: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const data = o.data ?? [];
  const max = o.max ?? Math.max(...data.map((d) => d.value));
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      {o.title && <Eyebrow draw={ease(f, fps, 0.25, 0.6)}>{o.title}</Eyebrow>}
      {data.map((d, i) => {
        const p = ease(f, fps, 0.35 + i * 0.15, 0.9);
        const hi = i === o.highlight;
        return (
          <div key={i} style={{ marginTop: i ? 26 : 0 }}>
            <div
              style={{
                fontFamily: BEBAS,
                fontSize: 46,
                letterSpacing: "0.04em",
                color: hi ? WHITE : MUTED,
                marginBottom: 8,
              }}
            >
              {d.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  height: 46,
                  width: `${(d.value / max) * 72 * p}%`,
                  background: hi ? RED : WINE,
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  fontFamily: BEBAS,
                  fontSize: 64,
                  color: hi ? RED : WHITE,
                  opacity: p,
                  whiteSpace: "nowrap",
                }}
              >
                {Math.round(d.value * p)}
                {o.suffix}
              </span>
            </div>
          </div>
        );
      })}
    </Card>
  );
};

// CTA: logo marki (`src`), czerwony przycisk Bebas (radius 4) i adres sklepu (`label`) Poppins 400.
const Cta: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const press =
    1 +
    0.04 * Math.sin(Math.min(1, Math.max(0, (f - 0.6 * fps) / 10)) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: width / 2,
        top: (o.y ?? 0.62) * height,
        transform: `translate(-50%, -50%) translateY(${(1 - enter) * 60 + exit * 30}px)`,
        opacity: Math.min(enter * 1.5, 1 - exit),
        filter: enter < 0.97 ? `blur(${(1 - enter) * 10}px)` : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      {o.src && (
        <Img
          src={src(o.src)}
          style={{
            width: 340,
            filter: "drop-shadow(0 4px 14px rgba(10,10,10,0.8))",
          }}
        />
      )}
      <div
        style={{
          background: RED,
          color: WHITE,
          fontFamily: BEBAS,
          fontSize: 78,
          letterSpacing: "0.04em",
          padding: "20px 48px 12px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          transform: `scale(${press})`,
          boxShadow: "0 18px 44px rgba(10,10,10,0.5)",
        }}
      >
        {o.text}
      </div>
      {o.label && (
        <div
          style={{
            fontFamily: POPPINS,
            fontWeight: 400,
            fontSize: 30,
            letterSpacing: "0.06em",
            color: WHITE,
            textShadow: GLOWUP.labelShadow,
          }}
        >
          {o.label}
        </div>
      )}
    </div>
  );
};

// Karta produktu przy wzmiance o nim: butelka wjeżdża ze smugą (motion blur marki) i przechyłem,
// obok eyebrow „GLOWUP”, nazwa Bebas i plakietka `label` (skład/dawka — bez działania, compliance).
// Logo marki zamiast napisu „GlowUp” (wersję white/black dobiera reel.json do tła).
const Logo: React.FC<{ file: string; h: number }> = ({ file, h }) => (
  <Img
    src={file}
    style={{
      height: h,
      width: "auto",
      display: "block",
      alignSelf: "flex-start",
      marginBottom: 22,
    }}
  />
);

// Samo logo przy wzmiance o marce: wjazd z rozmyciem, na dole jak karta (napisy nad nim).
const BrandLogo: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: (o.x ?? 0.5) * width,
        top: (o.y ?? 0.66) * height,
        transform: `translate(-50%, -50%) translateY(${(1 - enter) * 50 + exit * 20}px) scale(${0.92 + 0.08 * enter})`,
        opacity: Math.min(enter * 1.5, 1 - exit),
        filter: `blur(${(1 - enter) * 10}px) drop-shadow(0 6px 22px rgba(10,10,10,0.6))`,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      {o.src && (
        <Img
          src={src(o.src)}
          style={{ width: o.size ?? 560, display: "block" }}
        />
      )}
    </div>
  );
};

// Karta produktu przy wzmiance o nim: ogromna butelka wystaje poza kartę (góra) i jest pochylona ~8°
// od strony tekstu (tekst po prawej → w lewo; `flip` odwraca). Obok logo, nazwa Bebas i plakietka `label`
// (skład/dawka — bez działania, compliance).
const Product: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { height } = useVideoConfig();
  const img = ease(f, fps, 0.05, 0.7);
  const side = o.flip ? 1 : -1; // kierunek pochylenia
  // pop out ze sprężyną, potem gasnący wiggle i stałe subtelne kołysanie (wytyczne klienta 2026-10-09)
  const t = f / fps;
  const pop = spring({
    frame: f - 2,
    fps,
    config: { damping: 9, stiffness: 140 },
  });
  const w = t - 0.45;
  const wiggle = w > 0 ? 5 * Math.exp(-3 * w) * Math.sin(11 * w) : 0;
  const sway = 1.3 * Math.sin((2 * Math.PI * t) / 2.8);
  const bob = 6 * Math.sin((2 * Math.PI * t) / 2.8 + 1.2);
  const drop = 0.06 * height; // butelka ~10% kadru niżej niż w pierwszej wersji
  return (
    <Card o={o} enter={enter} exit={exit} src={src}>
      <Halftone show={ease(f, fps, 0.4, 0.8)} />
      <div
        style={{
          display: "flex",
          flexDirection: o.flip ? "row-reverse" : "row",
          alignItems: "center",
          gap: 30,
          minHeight: 300,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 300,
            alignSelf: "stretch",
            flexShrink: 0,
          }}
        >
          {o.src && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: -78 - drop,
                width: 300,
                height: 60,
                transform: `translateX(-50%) translateX(${-side * 30}px)`,
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0.85), rgba(0,0,0,0) 70%)",
                filter: "blur(6px)",
                opacity: img,
              }}
            />
          )}
          {o.src && (
            <Img
              src={src(o.src)}
              style={{
                position: "absolute",
                bottom: -70 - drop,
                left: "50%",
                height: 760,
                width: "auto",
                maxWidth: "none",
                transformOrigin: "50% 100%",
                transform: `translateX(-50%) translateX(${(1 - img) * side * 160}px) translateY(${bob}px) rotate(${side * (8 + (1 - img) * 10) + wiggle + sway}deg) scale(${0.7 + 0.3 * pop})`,
                // cień rzucony w stronę przeciwną do pochylenia + miękki cień kontaktowy (wytyczne klienta 2026-10-09)
                filter: `blur(${(1 - img) * 14}px) drop-shadow(${-side * 28}px 34px 26px rgba(10,10,10,0.85)) drop-shadow(0 10px 12px rgba(10,10,10,0.6)) drop-shadow(0 0 40px rgba(255,255,255,0.10))`,
                opacity: Math.min(1, img * 1.6),
              }}
            />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ opacity: ease(f, fps, 0.25) }}>
            {o.logo ? (
              <Logo file={src(o.logo)} h={46} />
            ) : (
              <Eyebrow draw={ease(f, fps, 0.25, 0.6)}>GlowUp</Eyebrow>
            )}
          </div>
          <div
            style={{
              fontFamily: BEBAS,
              fontSize: 110,
              lineHeight: 0.9,
              letterSpacing: "0.04em",
              opacity: ease(f, fps, 0.2),
            }}
          >
            {o.text}
          </div>
          {o.label && (
            <div style={{ marginTop: 20, opacity: ease(f, fps, 0.4) }}>
              <Badge size={22}>{o.label}</Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Proces na cały kadr: A → enzym → B (np. testosteron → aromataza → estrogen). Węzły wchodzą przy `at`,
// a od wejścia B cząstki płyną w prawo i po minięciu enzymu zmieniają kolor na czerwony.
const Process: React.FC<OverlayProps> = ({ o, dur, at, src }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const [a, e, b] = (o.items ?? []).map((it, i) =>
    typeof it === "string"
      ? { text: it, t: 0.2 + i * 0.6 }
      : { ...it, t: it.at != null ? at(it.at) : 0.2 + i * 0.6 },
  );
  const pa = ease(f, fps, a.t);
  const pe = ease(f, fps, e.t, 0.6);
  const pb = ease(f, fps, b.t);
  const flow = ease(f, fps, b.t - 0.9, 0.6);
  const cy = (o.y ?? 0.42) * height;
  const [x0, x1] = [width * 0.2, width * 0.8];
  const chip = (text: string, p: number, color: string, x: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: cy,
        transform: `translate(-50%, -50%) translateY(${(1 - p) * 30}px)`,
        opacity: p,
        filter: p < 0.97 ? `blur(${(1 - p) * 8}px)` : undefined,
        fontFamily: BEBAS,
        fontSize: 64,
        letterSpacing: "0.04em",
        color,
        padding: "16px 22px 10px",
        border: `1px solid ${color === RED ? RED : LINE}`,
        background: color === RED ? "rgba(230,58,70,0.12)" : BLACK,
        borderRadius: 4,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(10,10,10,0.95)",
        opacity: Math.min(enter * 1.5, 1 - exit),
        color: WHITE,
      }}
    >
      {o.sfx && <Audio src={src(o.sfx)} volume={o.sfxVolume ?? 0.3} />}
      <div style={{ position: "absolute", right: 40, top: height * 0.12 }}>
        <Halftone show={ease(f, fps, 0.3, 0.8)} />
      </div>
      <div
        style={{
          position: "absolute",
          left: width * 0.08,
          top: height * 0.15,
          right: width * 0.14,
        }}
      >
        {o.title && <Eyebrow draw={ease(f, fps, 0.2, 0.6)}>{o.title}</Eyebrow>}
        <div
          style={{
            fontFamily: BEBAS,
            fontSize: 180,
            lineHeight: 0.9,
            letterSpacing: "0.03em",
            opacity: pe,
            transform: `translateY(${(1 - pe) * 40}px)`,
          }}
        >
          {e.text}
        </div>
        {e.sub && (
          <div
            style={{
              fontFamily: POPPINS,
              fontSize: 30,
              color: MUTED,
              marginTop: 10,
              opacity: pe,
            }}
          >
            {e.sub}
          </div>
        )}
      </div>
      {/* tor przepływu */}
      <div
        style={{
          position: "absolute",
          left: x0,
          top: cy - 1,
          width: (x1 - x0) * pe,
          height: 2,
          background: LINE,
        }}
      />
      {Array.from({ length: 7 }, (_, i) => {
        const ph = (f / fps / 2.2 + i / 7) % 1;
        const x = x0 + 120 + (x1 - x0 - 240) * ph;
        const past = x > width / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 8,
              top: cy - 8,
              width: 16,
              height: 16,
              background: past ? RED : WHITE,
              opacity: flow * Math.sin(ph * Math.PI),
              boxShadow: past ? "0 0 14px rgba(230,58,70,0.8)" : undefined,
            }}
          />
        );
      })}
      {/* enzym */}
      <div
        style={{
          position: "absolute",
          left: width / 2,
          top: cy,
          width: 120,
          height: 120,
          transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * pe}) rotate(${(f / fps) * 60}deg)`,
          opacity: pe,
          border: `3px dashed ${RED}`,
          borderRadius: "50%",
          boxShadow: "0 0 30px rgba(230,58,70,0.35)",
        }}
      />
      {chip(a.text, pa, WHITE, x0)}
      {chip(b.text, pb, RED, x1)}
      {o.source && (
        <div
          style={{
            position: "absolute",
            left: width * 0.08,
            top: cy + 110,
            opacity: pe,
          }}
        >
          <Source>{o.source}</Source>
        </div>
      )}
    </div>
  );
};

export const GlowupOverlay: React.FC<OverlayProps> = (props) => {
  switch (props.o.type) {
    case "list":
      return <List {...props} />;
    case "counter":
      return <Dose {...props} />;
    case "bars":
      return <Bars {...props} />;
    case "cta":
      return <Cta {...props} />;
    case "product":
      return <Product {...props} />;
    case "process":
      return <Process {...props} />;
    case "logo":
      return <BrandLogo {...props} />;
    default:
      // ponytail: title/media/ring/line/compare jeszcze z silnika Bisanza; własne wersje, gdy rolka ich użyje
      return <Base {...props} />;
  }
};
