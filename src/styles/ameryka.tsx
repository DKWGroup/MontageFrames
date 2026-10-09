import { fitText } from "@remotion/layout-utils";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BISANZ,
  kineticCaptions,
  kineticOverlay,
  type OverlayProps,
  type Theme,
} from "./bisanz";

// Świeża Bryka Ameryka (swiezabrykaameryka.pl): silnik ruchu Bisanza, Poppins 900/600/400,
// zakreślacz na całe słowo zamiast kreski, ciemne karty ze złotą krawędzią.
// Kontrasty i zasady: klienci/swieza-bryka-ameryka/PREFERENCJE.md
const GOLD = "#B79154"; // czarny tekst na złotym 7,1:1
const BLACK = "#020203";
const BURGUNDY = "#651E1E"; // kremowy tekst na bordo 10,8:1
const CREAM = "#F6F3EE"; // tekst ze strony klienta

export const AMERYKA: Theme = {
  ...BISANZ,
  font: "Poppins, sans-serif",
  label: { font: "Poppins, sans-serif", size: 26, spacing: "0.3em" },
  text: CREAM,
  accent: GOLD,
  onAccent: BLACK,
  glow: "183,145,84",
  shade: "2,2,3",
  card: BLACK,
  cardText: CREAM,
  cardBorder: "rgba(183,145,84,0.45)",
  cardLine: "rgba(246,243,238,0.14)",
  pill: BLACK,
  pillText: CREAM,
  labelShadow: "0 2px 10px rgba(2,2,3,0.85)",
  keyWeight: 900,
  smallWeight: 600,
  titleStyle: "normal",
  ctaRadius: 18,
  keySize: 118,
  smallSize: 54,
  inlineKey: 92,
  inlineSmall: 54,
  shadow: "0 6px 22px rgba(2,2,3,0.6), 0 2px 4px rgba(2,2,3,0.7)",
  maxWidth: 0.8,
  y: 0.73,
  yRaised: 0.63,
  radius: 24,
  marker: {
    key: [GOLD, BLACK],
    hl: [BURGUNDY, CREAM],
    hlWeight: 800,
    hlPop: true,
  },
};

export const Ameryka = kineticCaptions(AMERYKA);
const Base = kineticOverlay(AMERYKA);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Star: React.FC<{ size: number; color?: string }> = ({
  size,
  color = GOLD,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <path
      d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6 5.6 21.1 7 14l-5.3-5 7.2-.9z"
      fill={color}
    />
  </svg>
);

// Wyliczanka jak pasy flagi USA: pas (czerń/bordo) wjeżdża od lewej, złota gwiazdka wyskakuje
// z obrotem, numer w złocie, punkt WERSALIKAMI Poppins 900. Bez karty; dolna krawędź w strefie TikToka.
const FlagList: React.FC<OverlayProps> = ({ o, dur, at }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const items = o.items ?? [];
  const exit = interpolate(f, [dur - 9, dur], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const textBox = width * 0.8 - 230;
  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.1,
        bottom: height * (1 - 0.75),
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 14,
        fontFamily: AMERYKA.font,
        opacity: 1 - exit,
        transform: `translateX(${exit * 80}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const s = spring({
            frame: f - 2 - i * 3,
            fps,
            config: { damping: 10, stiffness: 200 },
          });
          return (
            <div
              key={i}
              style={{
                transform: `scale(${s}) rotate(${(1 - s) * -90}deg)`,
                filter: "drop-shadow(0 2px 6px rgba(2,2,3,0.7))",
              }}
            >
              <Star size={26} />
            </div>
          );
        })}
        {o.title && (
          <div
            style={{
              marginLeft: 12,
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: CREAM,
              textShadow: AMERYKA.labelShadow,
            }}
          >
            {o.title}
          </div>
        )}
      </div>
      {items.map((it, i) => {
        const text = typeof it === "string" ? it : it.text;
        const t0 =
          typeof it !== "string" && it.at != null ? at(it.at) : 0.3 + i * 0.4;
        const lf = f - Math.round(t0 * fps);
        const band =
          lf < 0
            ? 0
            : spring({
                frame: lf,
                fps,
                config: { damping: 20, stiffness: 170 },
              });
        const star =
          lf < 0
            ? 0
            : spring({
                frame: lf - 2,
                fps,
                config: { damping: 8, stiffness: 190 },
              });
        const rise =
          lf < 0
            ? 0
            : spring({
                frame: lf - 5,
                fps,
                config: { damping: 18, stiffness: 210 },
              });
        const rule =
          lf < 0
            ? 0
            : spring({
                frame: lf - 9,
                fps,
                config: { damping: 20, stiffness: 140 },
              });
        const size = Math.min(
          50,
          fitText({
            text: text.toUpperCase(),
            withinWidth: textBox,
            fontFamily: AMERYKA.font,
            fontWeight: 900,
            validateFontIsLoaded: false,
          }).fontSize,
        );
        return (
          <div
            key={i}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "16px 34px 16px 26px",
              opacity: lf < 0 ? 0 : 1,
            }}
          >
            {/* pas flagi: skos jak pasy na masce muscle cara */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: i % 2 ? BURGUNDY : BLACK,
                transform: `skewX(-12deg) scaleX(${band})`,
                transformOrigin: "left",
                borderRadius: 6,
                boxShadow: "0 14px 34px rgba(2,2,3,0.35)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 4,
                background: GOLD,
                transform: `skewX(-12deg) scaleX(${rule})`,
                transformOrigin: "left",
              }}
            />
            <div
              style={{
                position: "relative",
                transform: `scale(${star}) rotate(${(1 - star) * -144}deg)`,
              }}
            >
              <Star size={44} />
            </div>
            <div
              style={{
                position: "relative",
                fontWeight: 400,
                fontSize: 24,
                letterSpacing: "0.2em",
                color: GOLD,
                opacity: rise,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "0 4px",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  color: CREAM,
                  transform: `translateY(${(1 - rise) * 110}%)`,
                }}
              >
                {text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AmerykaOverlay: React.FC<OverlayProps> = (props) =>
  props.o.type === "list" ? <FlagList {...props} /> : <Base {...props} />;
