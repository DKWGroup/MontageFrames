import {
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

// FitnessIQ (brandbook 2026-10-28): silnik ruchu Bisanza z zakreślaczem na całe słowo (jak Ameryka).
// Klucz Druk Wide Medium 500 wersalikami, czarny na limonce; małe słowa Mulish Medium 500, białe z cieniem.
// Limonka to jedyny akcent, nigdy na jasnym tle. Zasady: klienci/fitness-iq/PREFERENCJE.md
const INK = "#0B0B0B";
const LIME = "#BBE90B"; // czarny na limonce 13,85:1
const WHITE = "#FFFFFF";
const GRAY = "rgba(255,255,255,0.65)"; // etykiety: biel z alfą, bez czwartego koloru marki
const DRUK = "'Druk Wide Medium', sans-serif";
const MULISH = "Mulish, sans-serif";

export const FITNESSIQ: Theme = {
  ...AMERYKA,
  readable: true,
  font: MULISH,
  keyFont: DRUK,
  keySpacing: "-0.01em",
  markerRadius: "0.06em", // ostre rogi jak przyciski strony
  label: { font: MULISH, size: 26, spacing: "0.16em" },
  text: WHITE,
  accent: LIME,
  onAccent: INK,
  glow: "187,233,11",
  shade: "11,11,11",
  card: INK,
  cardText: WHITE,
  cardBorder: "rgba(255,255,255,0.25)",
  cardLine: "rgba(255,255,255,0.12)",
  pill: INK,
  pillText: WHITE,
  labelShadow: "0 2px 10px rgba(11,11,11,0.85)",
  keyWeight: 500,
  smallWeight: 500,
  titleStyle: "normal",
  ctaRadius: 8,
  radius: 8,
  keySize: 116,
  smallSize: 54,
  inlineKey: 90,
  inlineSmall: 54,
  shadow: "0 6px 22px rgba(11,11,11,0.65), 0 2px 4px rgba(11,11,11,0.75)",
  y: 0.68,
  yRaised: 0.6,
  marker: {
    key: [LIME, INK],
    hl: [INK, LIME], // `hl`: limonkowe słowo na czarnym bloku, przejeżdża od lewej
    hlWeight: 500,
  },
};

export const FitnessIQ = kineticCaptions(FITNESSIQ);
const Base = kineticOverlay(FITNESSIQ);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const useMotion = (dur: number) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: f,
    fps,
    config: { damping: 18, stiffness: 160 },
  });
  const exit = interpolate(f, [dur - 7, dur], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  return { f, fps, enter, exit };
};
const sweepAt = (f: number, fps: number, t: number, len = 0.35) =>
  interpolate(f, [t * fps, (t + len) * fps], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.exp),
  });

// Słowo na limonkowym zakreślaczu, który przejeżdża od lewej.
const Marked: React.FC<{ text: string; sweep: number }> = ({ text, sweep }) => (
  <span
    style={{
      display: "inline-block",
      position: "relative",
      padding: "0 0.12em",
    }}
  >
    {text}
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        padding: "0 0.12em",
        borderRadius: "0.06em",
        background: LIME,
        color: INK,
        textShadow: "none",
        clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)`,
      }}
    >
      {text}
    </span>
  </span>
);

// Hook: Druk Wide Medium 500 wersalikami, fragment `hl` na limonce.
const Title: React.FC<OverlayProps> = ({ o, dur }) => {
  const { f, fps, enter, exit } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const [before, ...rest] = o.hl ? o.text!.split(o.hl) : [o.text!];
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: (o.y ?? 0.66) * height,
        width: width * 0.8,
        transform: `translate(-50%, calc(-50% + ${(1 - enter) * 50 + exit * 20}px))`,
        opacity: Math.min(enter * 1.5, 1 - exit),
        textAlign: "center",
        fontFamily: DRUK,
        fontWeight: 500,
        textTransform: "uppercase",
        fontSize: o.size ?? 64,
        lineHeight: 1.14,
        letterSpacing: "-0.01em",
        color: WHITE,
        textShadow: FITNESSIQ.shadow,
      }}
    >
      {before}
      {o.hl && <Marked text={o.hl} sweep={sweepAt(f, fps, 0.25)} />}
      {rest.join(o.hl ?? "")}
    </div>
  );
};

// Plansza CTA na cały ekran: czarne tło, linie `items` wchodzą po kolei, ostatnia na limonce, logo na dole.
const Board: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const { f, fps, enter } = useMotion(dur);
  const { width, height } = useVideoConfig();
  const lines = (o.items ?? []).map((it) =>
    typeof it === "string" ? it : it.text,
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: INK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        padding: `0 ${width * 0.1}px`,
        textAlign: "center",
      }}
    >
      {lines.map((line, i) => {
        const t = 0.15 + i * 0.4;
        const k = spring({
          frame: f - Math.round(t * fps),
          fps,
          config: { damping: 16, stiffness: 170 },
        });
        const last = i === lines.length - 1;
        return (
          <div
            key={i}
            style={{
              fontFamily: DRUK,
              fontWeight: 500,
              textTransform: "uppercase",
              fontSize: o.size ?? 64,
              lineHeight: 1.12,
              letterSpacing: "-0.01em",
              color: WHITE,
              opacity: k,
              transform: `translateY(${(1 - k) * 40}px)`,
            }}
          >
            {last ? (
              <Marked text={line} sweep={sweepAt(f, fps, t + 0.2)} />
            ) : (
              line
            )}
          </div>
        );
      })}
      {o.src && (
        <Img
          src={src(o.src)}
          style={{
            position: "absolute",
            top: height * 0.2,
            transform: "translateY(-50%)",
            width: width * 0.54,
            opacity:
              interpolate(f, [0.3 * fps, 0.8 * fps], [0, 1], clamp) * enter,
          }}
        />
      )}
      {o.label && (
        <div
          style={{
            position: "absolute",
            top: height * 0.2,
            fontFamily: MULISH,
            fontWeight: 500,
            fontSize: 26,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: GRAY,
          }}
        >
          {o.label}
        </div>
      )}
    </div>
  );
};

// Oryginalny znak bez cienia, obrysu, przechylania i deformowania proporcji.
const Logo: React.FC<OverlayProps> = ({ o, dur, src }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (!o.src) return null;
  const opacity = Math.min(
    interpolate(f, [0, 5], [0, 1], clamp),
    interpolate(f, [dur - 5, dur], [1, 0], clamp),
  );
  return (
    <Img
      src={src(o.src)}
      style={{
        position: "absolute",
        left: (o.x ?? 0.5) * width,
        top: (o.y ?? 0.18) * height,
        width: o.size ?? 580,
        height: "auto",
        ...(o.fit === "card"
          ? { background: INK, padding: 20, borderRadius: 8 }
          : {}),
        transform: "translate(-50%, -50%)",
        opacity,
      }}
    />
  );
};

export const FitnessIQOverlay: React.FC<OverlayProps> = (props) =>
  props.o.type === "logo" ? (
    <Logo {...props} />
  ) : props.o.type === "title" ? (
    <Title {...props} />
  ) : props.o.type === "board" ? (
    <Board {...props} />
  ) : (
    <Base {...props} />
  );
